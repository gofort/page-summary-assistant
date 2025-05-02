/* global chrome */
(async () => {
  const dom = {
    status: document.getElementById('status'),
    output: document.getElementById('output')
  };

  function updateStatus(newText) {
    dom.status.classList.add('hidden');
    dom.status.addEventListener('transitionend', () => {
      dom.status.textContent = newText;
      dom.status.classList.remove('hidden');
    }, { once: true });
  }

  // Helper: read settings
  async function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        prompt: "Define the key facts and main developments (in other words, the most important information) of this text. Don't miss anything which looks important to mention. Write this in a form of bullet points. At the end, please write the essence of the article - what did author tried to say us?",
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
  async function * streamCompletion({ apiKey, apiPath, model, prompt }) {
    const payload = {
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    };

    const response = await fetch(`${apiPath.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let markdownContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // last line may be incomplete
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
            dom.output.innerHTML = marked.parse(markdownContent);
            dom.output.scrollTop = dom.output.scrollHeight;
          }
        } catch (_) {
          /* discard malformed JSON chunks */
        }
      }
    }
  }

  // Main
  try {
    const settings = await getSettings();
    if (!settings.apiKey) throw new Error('OpenAI key not set – open the extension options to configure it.');

    updateStatus('Fetching page text …');
    const pageText = await captureTabText();

    updateStatus('Talking to model …');
    const fullPrompt = `${settings.prompt}\n\nPAGE CONTENT:\n"""\n${pageText}\n"""`;

    let firstChunk = true;
    for await (const chunk of streamCompletion({
      apiKey: settings.apiKey,
      apiPath: settings.apiPath,
      model: settings.model,
      prompt: fullPrompt
    })) {
      if (firstChunk) {
        dom.status.classList.add('hidden');
        dom.status.addEventListener('transitionend', () => dom.status.remove(), { once: true });
        firstChunk = false;
      }
    }
  } catch (err) {
    dom.status.textContent = `Error: ${err.message}`;
  }

  document.getElementById('close-btn').addEventListener('click', () => {
    window.close();
  });

})();