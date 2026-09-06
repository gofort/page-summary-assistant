/* global chrome, marked, DEFAULTS, buildPayload */
(async () => {
  const outputEl = document.getElementById('output');
  const OPTIONAL_PARAMS = ['reasoning_effort', 'verbosity', 'temperature', 'max_completion_tokens'];

  document.getElementById('close-btn').addEventListener('click', () => window.close());

  marked.use({ breaks: false, gfm: true });

  function showError(message) {
    outputEl.innerHTML = '';
    const box = document.createElement('p');
    box.className = 'error';
    box.textContent = message;
    outputEl.appendChild(box);
  }

  function render(markdown) {
    outputEl.innerHTML = marked.parse(markdown);
    for (const link of outputEl.querySelectorAll('a')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  async function getSettings() {
    return new Promise(resolve => chrome.storage.sync.get(DEFAULTS, resolve));
  }

  async function captureTabText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });
    return result.trim();
  }

  /* Sends the request. If the API rejects one optional parameter, the function
     removes that parameter and sends the request again. New models then work
     even when the settings hold a parameter that they do not accept. */
  async function requestCompletion(url, apiKey, payload) {
    for (let attempt = 0; attempt < OPTIONAL_PARAMS.length + 1; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) return response;

      const body = await response.text();
      const bad = findRejectedParam(body, payload);
      if (response.status !== 400 || !bad) {
        throw new Error(errorMessage(response.status, body));
      }
      delete payload[bad];
    }
    throw new Error('The API rejected every parameter combination.');
  }

  function findRejectedParam(body, payload) {
    let param = '';
    try {
      param = JSON.parse(body)?.error?.param || '';
    } catch (_) { /* body is not JSON */ }
    if (OPTIONAL_PARAMS.includes(param) && param in payload) return param;
    return OPTIONAL_PARAMS.find(name => name in payload && body.includes(name)) || '';
  }

  function errorMessage(status, body) {
    try {
      const message = JSON.parse(body)?.error?.message;
      if (message) return message;
    } catch (_) { /* body is not JSON */ }
    return `API error ${status}`;
  }

  async function stream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let markdown = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const content = trimmed.slice(5).trim();
        if (content === '[DONE]') return;
        try {
          const delta = JSON.parse(content).choices?.[0]?.delta?.content;
          if (!delta) continue;
          markdown += delta;
          const atBottom =
            outputEl.scrollTop + outputEl.clientHeight >= outputEl.scrollHeight - 24;
          render(markdown);
          if (atBottom) outputEl.scrollTop = outputEl.scrollHeight;
        } catch (_) { /* ignore an incomplete chunk */ }
      }
    }
  }

  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      throw new Error('No API key. Open the extension options to set one.');
    }

    const pageText = await captureTabText();
    const messages = [{
      role: 'user',
      content: `${settings.prompt}\n\nPAGE CONTENT:\n"""\n${pageText}\n"""`
    }];

    const url = `${settings.apiPath.replace(/\/$/, '')}/v1/chat/completions`;
    const response = await requestCompletion(url, settings.apiKey, buildPayload(settings, messages));
    await stream(response);
  } catch (err) {
    showError(err.message);
  }
})();
