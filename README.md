# Page Summary Assistant

A Chrome extension that summarises the open page. Click the toolbar icon, and
the summary streams into the popup. The extension speaks to any
OpenAI-compatible endpoint.

## Features

- **One click.** The popup starts the summary immediately. No button is necessary.
- **Streaming output.** Text appears while the model writes it.
- **Markdown.** The popup renders headings, lists, code, and links.
- **Any endpoint.** OpenAI, or any server with a compatible `/v1` API.
- **Model list.** The options page reads the models from the endpoint.
- **Model parameters.** Set reasoning effort, verbosity, temperature, and max
  output tokens. An empty field sends no parameter.
- **Automatic retry.** If the API rejects a parameter, the extension removes
  that parameter and sends the request again.
- **Custom prompt.** Change the instruction, or reset it to the default.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Set **Developer mode** to on.
4. Click **Load unpacked**, and select the repository folder.

## Configuration

Open the options page of the extension, and set these values:

| Field | Purpose | Default |
|---|---|---|
| API key | The bearer token for the endpoint | empty |
| Base URL | The server address | `https://api.openai.com` |
| Model | The model name | `gpt-5.1` |
| Reasoning effort | `none` to `high` | model default |
| Verbosity | `low`, `medium`, or `high` | model default |
| Temperature | `0` to `2` | model default |
| Max output tokens | The token limit of the answer | model default |
| Prompt | The instruction before the page text | bullet-point summary |

The extension adds `/v1/chat/completions` to the base URL. Click **Load
models** to fill the model list from `/v1/models`.

The options page shows a badge for each parameter: `supported`, `not
supported`, or `unknown`. The badge is a hint from the model name. You can send
any parameter.

## How it works

1. The popup opens, and reads the settings from `chrome.storage.sync`.
2. `chrome.scripting` gets `document.body.innerText` from the active tab.
3. The extension sends the prompt and the page text to the endpoint, with
   `stream: true`.
4. The popup parses the server-sent events, and renders the Markdown.

Your API key and your settings stay in Chrome storage. The page text goes only
to the endpoint that you set.

## Files

| File | Content |
|---|---|
| `manifest.json` | Manifest V3 declaration |
| `popup.html`, `popup.js` | The summary window, and the streaming client |
| `options.html`, `options.js` | The settings page |
| `models.js` | Defaults, capability rules, and the request body |
| `style.css` | Styles for the popup and the options page |
| `lib/marked.min.js` | The Markdown renderer |

## Permissions

| Permission | Reason |
|---|---|
| `activeTab`, `scripting` | Read the text of the open page |
| `storage` | Keep the settings |
| `*://*/*` | Summarise a page on any site, and call your endpoint |

## License

MIT. See [LICENSE](LICENSE).
