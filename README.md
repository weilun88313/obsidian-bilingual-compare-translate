# Bilingual Compare Translate

An Obsidian plugin that keeps the current note editable on the left and shows a live translated pane on the right. The translation pane follows the note structure, supports block-level syncing, and can use multiple translation providers.

## Features

- Inline side-by-side translation pane for the active note
- Live refresh while editing the source note
- Block-level alignment, synced scrolling, and active block highlighting
- Toolbar language switching inside the translation pane
- Translation cache keyed by file path, model, language pair, and content hash
- OpenAI-compatible, Gemini, Anthropic Messages, and MyMemory free provider support
- Obsidian-native settings UI and SecretStorage support for API secrets

## Installation

### Manual install

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest GitHub release.
2. Create the folder:

```text
<vault>/.obsidian/plugins/bilingual-compare-translate/
```

3. Copy those three files into that folder.
4. Restart Obsidian and enable the plugin under Community plugins.

### Development install

Build locally and copy the output files into the same plugin folder inside your test vault.

## Usage

1. Open a Markdown note.
2. Run `Toggle live translation pane for current file`, or click the ribbon icon.
3. Edit the source note on the left and review the translated pane on the right.
4. Change source and target languages directly from the translation pane toolbar when needed.

## Privacy and network disclosure

- This plugin sends note content to the translation provider you configure.
- Provider traffic goes directly from the Obsidian client to the configured endpoint.
- If you use MyMemory, translated text is sent to a public translation service and its public usage limits apply.
- API keys can be stored in Obsidian SecretStorage and referenced by name, or entered directly in settings if your provider requires it.
- The plugin does not include telemetry, analytics, ads, account requirements, or remote logging.
- The plugin does not read or write files outside your vault.

## Compatibility notes

- `isDesktopOnly` is set to `false`, so the codebase is written to avoid top-level desktop-only Node dependencies.
- Network requests use Obsidian's `requestUrl`.
- Release artifacts should include only `manifest.json`, `main.js`, and `styles.css`.

## Development

```bash
npm install
npm run check
```

## GitHub release flow

- Push the repository to GitHub.
- Create and push a tag that exactly matches `manifest.json` and `package.json`, for example `0.1.0`.
- The included GitHub Actions workflow builds the plugin and publishes a GitHub release with:
  - `manifest.json`
  - `main.js`
  - `styles.css`

## Community plugin submission checklist

Before submitting to `obsidianmd/obsidian-releases`, make sure that:

- `README.md`, `LICENSE`, `manifest.json`, and `versions.json` are present in the repository root.
- The latest GitHub release tag matches the plugin version exactly and has `manifest.json`, `main.js`, and `styles.css` attached.
- The manifest author metadata reflects the final publisher name you want to show publicly.
- The README clearly discloses network use and any external services.

A fuller checklist is available in [`docs/release-checklist.md`](docs/release-checklist.md).
