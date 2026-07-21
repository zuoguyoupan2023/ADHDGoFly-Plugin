# ADHDGoFly Plugin — English Submission Guide

The full English README is [README.md](README.md). This file is kept as a stable English entry point for repositories and submission forms.

## OpenAI Build Week

ADHDGoFly existed before Build Week as an ADHD-friendly browser highlighter with a basic AI panel, chat, full-page context, and provider settings. During the Build Week submission period, I used Codex with GPT-5.6 to extend Jixia into a multi-workspace learning assistant for reading, writing, quizzes, vocabulary, image understanding, charts, and recoverable history.

Codex was used in an iterative build loop: inspect the repository, define a small boundary, implement, run checks, test in the browser, report the next observed issue, and review the diff. Concrete work included the JixiaContext/JixiaTask/JixiaState boundaries; Chat, Quiz, Explain, Vocabulary, image, chart, and history workflows; GLM-4V-Flash image recognition; ChartModel and local renderers; Reddit route protection; i18n; CSS isolation; narrow-panel layout fixes; and focused regression tests. GPT-5.6 was used inside Codex for the core architecture, workspace, image, chart, debugging, testing, and documentation sessions. Some supporting sessions used GPT-5.5 and should not be described as GPT-5.6 sessions. The extension remains multi-provider, so GPT-5.6 is not a required runtime provider.

The Build Week additions are described in the repository README, while the evidence is the dated Git history during the submission period plus a before/after comparison against the pre-existing release baseline.

## Quick judging path

1. Load the repository as an unpacked Chrome or Edge extension.
2. Open an article and launch Jixia.
3. Add full text to Chat and ask a contextual question.
4. Generate a reading result or quiz.
5. Run the image workspace on one page image.
6. Generate and export a chart.

See [README.md](README.md) for installation, configuration, testing, privacy, and the complete feature list.
