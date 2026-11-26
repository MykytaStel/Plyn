# Changelog

What changed for readers, release by release. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [docs/ROADMAP.md](docs/ROADMAP.md).

## [0.19.0] — 2026-11-26

Safety net I. Almost nothing new to see: this release protects your texts and your place in them with tests that run before every change.

### Fixed

- Reading statistics no longer lose a card when you swipe fast while read-aloud is on.
- Text written without a space after a full stop (for example `т.д.` or `год.Потім`) keeps its exact spelling on the card, and your place in it is saved precisely.
- A text that starts with `?`, `!` or `…` no longer loses that first character on the card or in sentence focus.

### Under the hood

- Tests for the library database, backup export and import, the splitter (property-based), the EPUB parser and onboarding.
- Every pull request runs lint, typecheck, tests with coverage and the build before anything reaches production.
- `/api/extract` answers with an error code only (the app shows the message in your language since 0.17).

## Before 0.19

A short summary of earlier releases (details live in the git tags).

- **0.18.0** — Calmer toolbar: a "⋯" menu keeps the phone toolbar to four actions; Settings opens from the library and is grouped into sections; the same text opens the copy already in your library instead of a duplicate.
- **0.17.0–0.17.1** — English interface next to Ukrainian; card language follows the text, not the interface; Escape closes sheets; long titles wrap; readable titles from file names.
- **0.16.0** — Cyrillic reading fonts: Fixel Text and Andika.
- **0.15.0** — ADHD and dyslexia suite: one-tap presets, Thought Parking, offline brown noise, word-by-word read-aloud, sentence ruler, narrow column, PDF import.
- **0.10.0** — Read-aloud with speed and auto-advance, bookmark notes and Markdown export, 7-day rhythm, library filters, 5-card easy start.
- **0.8.x** — Sentence focus, onboarding, Web Share Target, mint theme, letter spacing, Zen mode, library search, JSON backup.
- **0.5 and earlier** — Cards, IndexedDB library, file import (EPUB, URL), bookmarks, focus timer, dyslexia fonts, achievements.

[0.19.0]: https://github.com/MykytaStel/Plyn/compare/v0.18.0...v0.19.0
