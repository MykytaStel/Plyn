# Changelog

What changed for readers, release by release. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [docs/ROADMAP.md](docs/ROADMAP.md).

## [0.23.0] — 2026-11-26

Books import well.

### Added

- Books keep their contents. For an EPUB or FB2 with chapters, the bookmarks sheet shows "Contents": tap a chapter to go there. Plyn marks the chapter you are in.
- The author of a book appears under its title in the library, and search finds books by author.
- FB2 books (`.fb2` and `.fb2.zip`) import, including old files in Windows-1251.
- Old `.txt` files in Windows-1251, KOI8-U or UTF-16 open without broken letters. If Plyn is not sure about a file, it says so calmly.

### Changed

- Big books no longer freeze the screen while they import.

### Under the hood

- Golden files for every parser in `spec/parsers/`: one self-written text in nine encodings, and self-written EPUB and FB2 books with hand-written expected text and chapters.
- New browser journey: open a book's contents and jump to a chapter. Import journeys for FB2 and a Windows-1251 `.txt`.
- Backups keep the author and the contents of a book. They are still version 2, so older versions can read them.

## [0.22.0] — 2026-11-26

Feels like an app.

### Added

- The back gesture on Android (and the browser's back button) closes the open sheet, then returns from the text to the library. It no longer leaves Plyn in the middle of a text.
- The screen stays on while you read or listen. After 10 minutes without moving on it may turn off again. Settings → "Keep the screen on" turns this off.
- Proper home-screen icons on iPhone and Android.
- A new version of Plyn never reloads the page while you read. When one is ready, the library says so quietly, with "Update now"; otherwise it opens next time you come back.
- When a sheet opens, the keyboard and screen readers move into it, and come back to the button that opened it when it closes.

### Under the hood

- Visual checks: every theme and font is compared with saved screenshots before each change.
- The reader screen is split into small parts, so new features are safer to add.
- Newer build tools (Vite 8): the app builds much faster.
- New browser journeys: the back button, sharing a text into Plyn, keeping the screen on, and an update arriving while you read.

## [0.21.0] — 2026-11-26

Your library is safe.

### Added

- Plyn asks the browser to keep your library, so it isn't cleared when the device runs low on space. Settings → "Your library" shows how much Plyn takes and whether the browser agreed, with a button to ask again.
- Backups now also keep your Thought Parking notes and settings. Older backups still import. Settings from a backup are applied only on a device that has none of its own, for example after you clear the browser.
- On a phone, "Backup" opens the share sheet, so the file goes to Files, iCloud or Drive in one step.
- Deleted a text by mistake? "Undo" stays for a few seconds and brings it back with your place and bookmarks.
- If something breaks, a calm screen offers to save a backup and reload, instead of a blank page.
- Settings now show which version of Plyn you have, at the very bottom.

### Fixed

- A bookmark or a bookmark note added within a quarter of a second after moving to a new card is no longer lost after a reload.

### Under the hood

- Backup files from every version are kept in `spec/backups/` and imported on every change.
- New browser journeys: backup → clear the device → restore, delete → Undo, parking a thought mid-text, and exporting bookmark notes to Markdown.

## [0.20.0] — 2026-11-26

Safety net II. Plyn is now checked in real browsers (Chrome and Safari, desktop and phone) before every change, including offline and with the keyboard only. Those checks found a few things worth fixing.

### Fixed

- Your place is kept even if you close the app or reload right after swiping to a new card.
- Importing from a link while offline now says calmly that it needs the internet, instead of blaming the site.
- Easier to read in the Paper, Gray and Mint themes: secondary text, the first-card hint, the Paper buttons and award messages have stronger contrast.
- Screen readers hear the same words you see on the "Library", "Anchor", awards, thoughts and bookmark-count buttons.
- A text in the library opens with one clear button, which screen readers and the keyboard can reach. Rename and delete stay separate.

### Under the hood

- Playwright journeys: first run, coming back to the same card after a reload, changing card length, EPUB and PDF import, offline use, and a keyboard-only session in the Latin and Ukrainian layouts.
- Automatic accessibility checks (axe) on every screen and sheet, in all four themes.
- Every pull request gets its own preview link, so changes can be tried on a phone before they reach you.

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

[0.20.0]: https://github.com/MykytaStel/Plyn/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/MykytaStel/Plyn/compare/v0.18.0...v0.19.0
