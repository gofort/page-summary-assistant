/* global chrome */
(async () => {
  const outputEl = document.getElementById('output');

  // Helper: read settings
  async function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        prompt: "Define the key facts and main developments ...",
        apiKey: '',
        apiPath: 'https://api.openai.com',
        model: 'gpt-4.1'
      }, resolve);
    });
  }

  // Helper: collect visible text from the active tab
  async function captureTabText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });
    return result.trim();
  }

  // Stream OpenAI‑compatible chat completion
  async function* streamCompletion({ apiKey, apiPath, model, prompt }) {
    const payload = { model, stream: true, messages: [{ role: 'user', content: prompt }] };
    const response = await fetch(`${apiPath.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let markdownContent = '';

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
          const json = JSON.parse(content);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            markdownContent += delta;
            outputEl.innerHTML = marked.parse(markdownContent);
            // auto-scroll
            const { scrollTop, scrollHeight, clientHeight } = outputEl;
            if (scrollTop + clientHeight >= scrollHeight - 10) {
              outputEl.scrollTop = scrollHeight;
            }
          }
        } catch (_) {
          // ignore
        }
      }
    }
  }

  // Main
  try {
    const settings = await getSettings();
    if (!settings.apiKey) throw new Error('OpenAI key not set – open the extension options to configure it.');

    const pageText = await captureTabText();
    const fullPrompt = `${settings.prompt}\n\nPAGE CONTENT:\n"""\n${pageText}\n"""`;

    for await (const _ of streamCompletion({
      apiKey: settings.apiKey,
      apiPath: settings.apiPath,
      model: settings.model,
      prompt: fullPrompt
    })) {
      // streaming
    }
  } catch (err) {
    outputEl.innerHTML = `<p>Error: ${err.message}</p>`;
  }

  document.getElementById('close-btn').addEventListener('click', () => window.close());
})();