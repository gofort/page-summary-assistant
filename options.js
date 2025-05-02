/* global chrome */
const ids = ['prompt', 'apiKey', 'apiPath', 'model'];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const saved = document.getElementById('saved');

function load() {
  chrome.storage.sync.get({
    prompt: "Define the key facts and main developments (in other words, the most important information) of this text. Don't miss anything which looks important to mention. Write this in a form of bullet points. At the end, please write the essence of the article - what did author tried to say us?",
    apiKey: '',
    apiPath: 'https://api.openai.com',
    model: 'gpt-4.1'
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