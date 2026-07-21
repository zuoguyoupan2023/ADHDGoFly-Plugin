# ADHDGoFly Plugin

**English** | [中文](README-cn.md)

ADHDGoFly is a browser reading assistant for ADHD users, language learners, and heavy web readers. It started as a multilingual part-of-speech highlighter and has grown into an in-page learning workspace: highlighting plus the Jixia AI panel for summaries, chat, quizzes, vocabulary review, image understanding, charts, and recoverable workspace history.

Current version: `0.1.8`

## OpenAI Build Week Submission

ADHDGoFly existed before OpenAI Build Week as an ADHD-friendly browser highlighter with a basic AI panel, chat, full-page context, and provider settings. During the Build Week submission period, I used Codex with GPT-5.6 to meaningfully extend the Jixia panel into a multi-workspace learning assistant. The submission focuses on the work added during Build Week, not on claiming that the entire pre-existing project was built from scratch during the event.

### What was added during Build Week

- Clear `JixiaContext`, `JixiaTask`, and `JixiaState` boundaries for page context, AI work, and UI state.
- Reading, writing, quiz, vocabulary, explanation, image, chart, and records workspaces.
- Article comprehension quizzes with answer explanations, validation, and history restore.
- Image discovery, batch selection, OCR/visual understanding, history, export, and Chat attachment.
- Structured `ChartModel` generation and editing with SVG, JSON, HTML, and PNG export.
- Unified history, workspace save/restore behavior, i18n updates, and focused regression tests.

### How Codex and GPT-5.6 were used

Codex was the primary development partner for the Build Week work. I used it in an iterative loop: describe a product or bug, inspect the existing repository, agree on a small implementation boundary, edit the code, run checks, test in the browser, report the next observed issue, and review the resulting diff. I made the product, UX, compatibility, and “what is finished” decisions; Codex accelerated the investigation, implementation, debugging, and verification loop.

The concrete Build Week work completed with Codex included:

- Turning the old floating AI panel into the Jixia workspace model and separating the plugin Side Panel from the in-page workspace.
- Defining `JixiaContext`, `JixiaTask`, and `JixiaState`, then extracting Chat, Quiz, Explain, Vocabulary, and UI event modules from the large content script.
- Building article reading, writing, comprehension quiz, vocabulary, history, image, and chart workflows.
- Designing the image pipeline around page-image discovery, filtering, batch selection, GLM-4V-Flash OCR/visual recognition, progress/failure states, and adding recognition results to Chat.
- Building the structured `ChartModel` path, deterministic rendering, Mermaid/Rough/ECharts local runtimes, node/edge/lane editing, natural-language chart changes, source references, and SVG/JSON/HTML/PNG export.
- Debugging real browser issues: Reddit SPA route/context errors, provider/model state, reasoning controls, hardcoded Chinese strings, history rendering, host-page CSS pollution, narrow-panel layout, initialization-order failures, and loading states.
- Adding focused checks for context resolution, Jixia modules, UI bindings, chart behavior, image filtering, CSS isolation, i18n, and export/runtime behavior.

GPT-5.6 was used inside Codex for the core development sessions that worked through the Jixia architecture, workspace implementation, multimodal/image flow, chart model, UI iterations, debugging, tests, and documentation. Some supporting Codex sessions used GPT-5.5; they should not be described as GPT-5.6 sessions. The extension itself remains multi-provider: GPT-5.6 was used to build this version, but it is not a required runtime provider for users.

Key decisions made during this work included keeping page context explicit, separating AI task state from UI state, preserving recoverable history, separating workspace clearing from saved-record deletion, using a structured chart model instead of executing generated scripts, treating pure-text and vision models differently, and preserving the existing extension's storage and provider settings. These decisions are visible in `content/jixia-context-resolver.js`, `content/jixia-modules.js`, `content/chart-model.js`, `content/chart-workspace.js`, `content/page-image-filter.js`, and the related tests.

### Build Week evidence and testing

- Pre-existing baseline: the `0.1.8` extension already provided highlighting, a basic AI panel/chat, full-page context, and settings.
- Build Week evidence: the repository's dated commit history during the submission period, together with the before/after comparison against the pre-existing release baseline.
- Core checks: `node --check content/main.js`, `node test-jixia-modules.js`, `node test-jixia-ui-modules.js`, `node test-chart-workspace.js`, and `node test-i18n-regression.js`.
- Devpost submission: include the primary Codex thread's `/feedback` Session ID in the submission form.

For the judging path, load the unpacked extension, open an article, launch Jixia, add full text to Chat, generate a reading result or quiz, inspect an image, and generate/export a chart. The public demo video keeps this path under three minutes and includes the required Codex/GPT-5.6 explanation.

## Core Features

### Multilingual Highlighting

- Supports Chinese, English, Japanese, French, Spanish, and Russian.
- Highlights nouns, verbs, adjectives, adverbs, and other parts of speech with configurable colors.
- Includes page-level highlight toggles, color themes, text styles, and folding settings.
- Uses node-level caching, streaming page processing, and dynamic-page reprocessing.
- Supports built-in dictionaries, custom dictionaries, and AI-generated article dictionaries.

### Browser Side Panel

- Opens from the browser extension icon.
- Includes Home, Dictionary, Statistics, AI, Colors, About, and Settings views.
- Provides the main configuration surface for AI Provider, Model, API Key, Base URL, and Temperature.
- Supports storage statistics, version information, privacy settings, and dictionary management.

### Jixia AI Workspace

Jixia is an in-page floating AI workspace injected by the content script. It is designed to reduce copy-paste work and keep reading, asking, reviewing, and visualizing close to the current page.

- Chat: ask questions using the current page, selected text, paragraphs, or manual context; start a new conversation without deleting history.
- Full text context: add the current webpage or PDF body to Chat with one click.
- Reading: summarize, explain for beginners, create structured reading notes, extract outlines and keywords, and classify factual claims.
- Writing: translate, rewrite as news, summarize style, imitate style, and prepare chart material.
- Quiz: generate comprehension questions from the current article with difficulty, count, explanations, and history restore.
- Vocabulary: generate review cards, track mastery, and save words into a local dictionary.
- Explain: explain selected text and continue the follow-up in Chat.
- Image workspace: discover page images, select batches, run OCR or visual understanding, view history, export, and add results to Chat.
- Chart workspace: generate relation diagrams, flowcharts, and data charts from the current context; edit, save, export, and revise with AI.
- Workspace clearing: manually clear the current Chat, Reading, Writing, Quiz, Vocabulary, Image, or Chart workspace without deleting saved IndexedDB/history records.
- Records: browse and restore Chat, Reading, Writing, Quiz, Image, and Chart records.

### Charts And Visualization

- Bundles `ECharts`, `Mermaid`, and `Rough.js` locally instead of loading runtime scripts from a CDN.
- Uses a structured `ChartModel` as the chart data boundary.
- Supports SVG, JSON, HTML, and PNG export.
- Supports node and edge editing, lanes, undo/redo, version restore, and version comparison.
- AI chart edits update and validate the structured model before rendering; AI output is not executed as script.

### Multiple AI Providers

The codebase includes configuration and fallback logic for:

- DeepSeek
- Moonshot
- OpenAI / ChatGPT
- Anthropic / Claude
- Qwen
- ChatGLM
- MiniMax
- Gemini
- Grok

API keys are stored in browser local storage. They are not committed to the repository and are not written into normal chat records.

## Installation

### Chrome / Edge Developer Mode

1. Clone or download this repository.
2. Open the browser extension management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repository root folder.
6. Open a normal webpage and click the ADHDGoFly extension icon.

### Configure AI

1. Open the Side Panel or the Jixia settings view.
2. Go to AI / API settings.
3. Choose a Provider and Model.
4. Enter the API Key and Base URL.
5. Save, then test the connection in Jixia Chat.

Media recognition currently has a separate GLM-4V-Flash key setting for image OCR and visual understanding.

## Usage

### Read A Webpage

1. Open an article or post.
2. Click the extension icon to open the Side Panel.
3. Enable highlighting or adjust part-of-speech colors.
4. Open Jixia.
5. Click `+ Full text` to add the current page body to Chat.
6. Run summary, structured reading, quiz, or vocabulary review.

### Use Selected Text

1. Select text on the webpage.
2. Set Jixia context to Selection.
3. Use Explain, Translate, Writing, or Chat follow-up.

### Use The Image Workspace

1. Open the Jixia image workspace.
2. Discover page images or upload images.
3. Select the images to process.
4. Send them for recognition.
5. Add recognition results to Chat or export them.

### Use The Chart Workspace

1. Open the Jixia chart workspace.
2. Generate a chart from the current page material.
3. Choose a chart type and rendering mode.
4. Edit nodes and edges, or ask AI to revise the chart with natural language.
5. Export as SVG, JSON, HTML, or PNG.

## Project Structure

```text
.
├── manifest.json                  # Manifest V3 extension config
├── background.js                  # Service worker, AI requests, storage, Side Panel entry
├── popup.html / popup.js          # Side Panel UI
├── content.js                     # Legacy highlighting entry
├── content/
│   ├── main.js                    # Jixia overlay, workspace orchestration, page collection, highlighting
│   ├── jixia-context-resolver.js  # Context routeKey/textHash/stale checks
│   ├── jixia-modules.js           # Chat, Quiz, Explain, Vocabulary modules
│   ├── jixia-ui-modules.js        # Jixia UI event bindings
│   ├── chart-model.js             # Structured chart model
│   ├── chart-workspace.js         # Chart save, export, and version features
│   ├── chart-layout.js            # Chart layout and rendering helpers
│   ├── page-image-filter.js       # Page image filtering
│   ├── page-processor.js          # Traditional page highlighting processor
│   └── streaming-page-processor.js# Streaming/dynamic page highlighting processor
├── dictionaries/                  # Multilingual dictionary resources
├── locales/                       # English and Chinese UI strings
├── lib/                           # Local visualization runtimes
├── offscreen/                     # PDF parsing files
└── test-*.js / tests/             # Regression tests
```

## Testing

Common checks:

```bash
node --check content/main.js
node --check content/jixia-context-resolver.js
node --test tests/jixia-context-resolver.test.js
node test-jixia-modules.js
node test-jixia-ui-modules.js
node test-chart-workspace.js
node test-i18n-regression.js
```

Build:

```bash
npm run build
```

Store build:

```bash
npm run build:store
```

## Dynamic Page Notes

Reddit, documentation sites, and modern SPA pages often insert article content asynchronously after route changes. Jixia uses `JixiaContextResolver` to generate route keys and checks text hashes plus stale reasons so an old page or feed does not get treated as the current article.

If AI summarizes the Reddit feed after opening a post, check:

- Whether the current URL and canonical URL differ.
- Whether the route key represents a specific post rather than the home feed or subreddit list.
- The `textOrigin`, `textHash`, and `staleReason` returned by `jixiaContext.resolve('full_article')`.
- Whether the Reddit post body has finished rendering.

Related regression test:

```bash
node --test tests/jixia-context-resolver.test.js
```

## Privacy And Safety

- API keys are stored in browser local storage.
- Images and audio require user confirmation before being sent to AI.
- Chart runtimes are bundled locally and are not loaded from remote CDNs at runtime.
- AI responses are not executed as scripts.
- AI chart edits are validated through the structured `ChartModel` before rendering.
- Webpage text, images, and PDFs are sent to AI only through user action and configuration.

## License

MIT

Third-party dependency licenses are listed in [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md).
