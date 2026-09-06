/* global chrome, DEFAULTS, DEFAULT_PROMPT, detectCapabilities */
const IDS = ['prompt', 'apiKey', 'apiPath', 'model', 'reasoningEffort', 'verbosity', 'temperature', 'maxTokens'];
const els = Object.fromEntries(IDS.map(id => [id, document.getElementById(id)]));
const saved = document.getElementById('saved');
const modelStatus = document.getElementById('model-status');
const modelList = document.getElementById('model-list');

const BADGES = {
  reasoningEffort: document.getElementById('cap-reasoning'),
  verbosity: document.getElementById('cap-verbosity'),
  temperature: document.getElementById('cap-temperature')
};

function showCapabilities() {
  const caps = detectCapabilities(els.model.value);
  for (const [key, badge] of Object.entries(BADGES)) {
    const state = caps[key];
    badge.textContent = state === true ? 'supported' : state === false ? 'not supported' : 'unknown';
    badge.classList.toggle('is-supported', state === true);
  }
}

function load() {
  chrome.storage.sync.get(DEFAULTS, data => {
    IDS.forEach(id => (els[id].value = data[id] ?? ''));
    showCapabilities();
  });
}

function save(event) {
  event.preventDefault();
  const data = Object.fromEntries(IDS.map(id => [id, els[id].value.trim()]));
  chrome.storage.sync.set(data, () => {
    saved.classList.add('visible');
    setTimeout(() => saved.classList.remove('visible'), 1600);
  });
}

/* Reads the model list from the endpoint. The list then always holds the
   current models, and no update of the extension is necessary. */
async function loadModels() {
  const key = els.apiKey.value.trim();
  const base = (els.apiPath.value.trim() || DEFAULTS.apiPath).replace(/\/$/, '');
  if (!key) {
    modelStatus.textContent = 'Enter the API key first.';
    return;
  }
  modelStatus.textContent = 'Loading…';
  try {
    const response = await fetch(`${base}/v1/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const ids = ((await response.json()).data || [])
      .map(item => item.id)
      .filter(Boolean)
      .sort();
    modelList.innerHTML = '';
    for (const id of ids) {
      const option = document.createElement('option');
      option.value = id;
      modelList.appendChild(option);
    }
    modelStatus.textContent = `${ids.length} models available.`;
  } catch (err) {
    modelStatus.textContent = err.message;
  }
}

document.getElementById('form').addEventListener('submit', save);
document.getElementById('refresh').addEventListener('click', loadModels);
document.getElementById('reset').addEventListener('click', () => {
  els.prompt.value = DEFAULT_PROMPT;
});
els.model.addEventListener('input', showCapabilities);
load();
