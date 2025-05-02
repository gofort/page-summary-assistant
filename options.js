/* global chrome */
const ids = ['prompt', 'apiKey', 'apiPath', 'model'];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const saved = document.getElementById('saved');

function load() {
  chrome.storage.sync.get({
    prompt: 'Give me a concise, bullet‑point summary of the page.',
    apiKey: '',
    apiPath: 'https://api.openai.com',
    model: 'gpt-4o'
  }, data => {
    ids.forEach(id => (els[id].value = data[id] || ''));
  });
}

function save(e) {
  e.preventDefault();
  const data = Object.fromEntries(ids.map(id => [id, els[id].value.trim()]));
  chrome.storage.sync.set(data, () => {
    saved.classList.add('visible');
    setTimeout(() => saved.classList.remove('visible'), 1500);
  });
}

document.getElementById('form').addEventListener('submit', save);
load();