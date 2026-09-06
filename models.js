/* Shared settings defaults and model capability rules. */

const DEFAULT_PROMPT =
  "Define the key facts and main developments (in other words, the most important information) of this text. Don't miss anything which looks important to mention. Write this in a form of bullet points. At the end, please write the essence of the article - what did author tried to say us?";

const DEFAULTS = {
  prompt: DEFAULT_PROMPT,
  apiKey: '',
  apiPath: 'https://api.openai.com',
  model: 'gpt-5.1',
  reasoningEffort: '',   // '' = do not send
  verbosity: '',         // '' = do not send
  temperature: '',       // '' = do not send
  maxTokens: ''          // '' = do not send
};

/* Patterns tell which parameters a model family accepts. The list is a hint
   only. The user can send any parameter, and the popup removes a parameter
   that the API rejects. */
const CAPABILITY_RULES = [
  { test: /^(gpt-5|gpt-6|o\d)/i, caps: { reasoningEffort: true, verbosity: true, temperature: false } },
  { test: /^gpt-4/i,             caps: { reasoningEffort: false, verbosity: false, temperature: true } },
  { test: /^(chatgpt|gpt-3)/i,   caps: { reasoningEffort: false, verbosity: false, temperature: true } }
];

/* Returns true, false, or null (unknown) for each parameter. */
function detectCapabilities(model) {
  const name = (model || '').trim();
  for (const rule of CAPABILITY_RULES) {
    if (rule.test.test(name)) {
      return { known: true, ...rule.caps };
    }
  }
  return { known: false, reasoningEffort: null, verbosity: null, temperature: null };
}

/* Builds the request body from the settings. */
function buildPayload(settings, messages) {
  const payload = { model: settings.model, stream: true, messages };
  if (settings.reasoningEffort) payload.reasoning_effort = settings.reasoningEffort;
  if (settings.verbosity) payload.verbosity = settings.verbosity;
  if (settings.temperature !== '' && settings.temperature != null) {
    payload.temperature = Number(settings.temperature);
  }
  if (settings.maxTokens) payload.max_completion_tokens = Number(settings.maxTokens);
  return payload;
}
