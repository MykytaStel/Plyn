# Changelog

What changed for readers, release by release. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [docs/ROADMAP.md](docs/ROADMAP.md).

## [0.27.0] — 2026-11-27

Reading comfort, calmer settings.

### Added

- A quiet "about 12 min left" next to the card counter: time to the end of the chapter, or of the text. It learns your own pace as you read (after about 20 cards; until then it assumes a calm pace). Time spent listening, in a sheet or away from the app doesn't count. Hide it in Settings → Reading. The library shows the same estimate on each text, and "Finished" on a finished one.
- If you parked thoughts while reading, the end of the text says so and opens them under "From this reading". Leave a text early and the library offers the same link for a moment.
- Save Thought Parking to a Markdown file. On a phone, thoughts, bookmarks and backups open the share sheet, so you can send them to Notes or Files.

### Changed

- Settings are calmer: presets on top, then five sections (Appearance, Reading, Aids, Sound and voice, Language and library), each with a one-line summary of what's on. A section opens on its own screen; back returns to the list.
- Backup and restore moved from the library into Settings → Language and library. Restore is offered only from the library, not in the middle of a text.
- The voice list looks like the other controls: the arrow stays inside, and the text is large enough that iPhone doesn't zoom in.
- The browser no longer adds its own hyphens to card text; a word longer than the line still wraps.
- Calmer placeholders ("For example: Chapter 3", "What’s on your mind?"), and the backup file is named by your local date.

### Under the hood

- Reading pace: `src/core/reading/pace.ts` (moving average, 60–600 words per minute, 20 samples before it's used) and `timeLeft.ts`; samples are written with the progress delta in one transaction. Stored as `stats.readingPace`; a backup import keeps the pace with more samples.
- New settings `showTimeLeft` (on) and `syllableHints` (off, hidden) in `plyn_settings_v1` (defaults, no migration). Backups stay schema 2; new fixture `spec/backups/v2-0.27.json`.
- `src/core/export/thoughtsMarkdown.ts` escapes Markdown markers so a thought stays plain text; one `saveFile` helper (`src/services/files/`) for every export.
- Settings split into `features/settings/sections/` with summaries in `settingsSummary.ts`. New journey `e2e/cuj-16-settings.spec.ts`; axe scans every section in all four themes; new visual baselines for the first screen and the Sound section.
- EXP-03 (syllable hints for long Ukrainian words): rules and 535 cases reviewed, splitter and three display prototypes on the `exp/03-syllable-hints` branch. Not in this release; the display is still being chosen.

## [0.26.0] — 2026-11-27

Listening, upgraded.

### Added

- The word being read aloud can be highlighted, so your eyes can follow the voice. Turn it on in Settings → Sound. It works with most system voices; with a voice that doesn't say where it is, the highlight simply stays hidden.
- Choose a voice for Ukrainian and one for English in Settings → Sound. You hear a short sample as soon as you pick one. Voices that need the internet are marked.
- With "Keep listening" on, listening stops at the start of a new chapter and shows its title. Turn read-aloud on again (or press S) to keep listening.

### Changed

- "Keep listening" no longer pauses between cards: the next card starts right away, and the screen follows.
- A double tap on a word speaks it in your chosen voice.
- A speed, voice or highlight change while listening applies from the next card.

### Under the hood

- EXP-02 measured where browsers report the spoken word (iOS Safari and Chrome, macOS Chromium: yes, for Ukrainian). Probe page in `experiments/exp-02/`.
- `src/services/speech/tts.ts` now owns voices, a per-card queue in one session, word ranges and the 3-second "no word positions" rule; pure helpers `src/core/speech/wordRange.ts` and `src/core/reading/chapterBoundary.ts`.
- New settings `ttsWordHighlight` and `ttsVoices` in `plyn_settings_v1` (defaults, no migration). Backups stay schema 2; new fixture `spec/backups/v2-0.26.json`.
- Tests against a fake `speechSynthesis` (`test/fakeSpeech.ts`), and a stubbed voice for journeys (`e2e/support/speech.ts`): new journey `e2e/cuj-15-listening.spec.ts` and a spoken-word visual per theme.

## [0.25.0] — 2026-11-27

Light and fast.

### Added

- PDFs with their own table of contents get "Contents", like EPUB and FB2 books: tap a chapter to go there.
- A new book with contents opens at its first chapter, past the title page and imprint. Nothing is cut: the title page is one swipe back.

### Changed

- Big books no longer lag. Moving to the next card, changing the column width or the card length is instant even in a book with 10,000 cards.
- The library opens fast however many big books it holds, and adding a text you already have is found at once.
- Opening a very long book or changing the card length no longer freezes the screen: the splitting runs in the background.
- The app loads a little less code at start: EPUB and FB2 support loads when you open such a book.

### Under the hood

- The reader keeps only the cards around the current one in the page (about a dozen); the rest are spacers of the same height (`src/core/reading/feedWindow.ts`). A far jump (scrubber, contents, bookmarks, "start again") moves the window first, then scrolls. New journey `e2e/cuj-13-long-book.spec.ts`.
- Dexie `version(4)` (IMP-06): texts live in a `texts` table; `documents` keeps light rows with `textHash`, `textLength` and `wordCount`. The upgrade moves every text in one transaction; tests upgrade from version 1 and 3. Duplicates are found by `textHash` (`src/core/text/textHash.ts`, cyrb53) and confirmed by comparing the text. Backups keep the text inline, unchanged (schema 2).
- Texts of 100,000+ characters are split in a Web Worker (`src/services/splitter/`), with a main-thread fallback; the result is exactly `splitTextIntoCards`.
- PDF outline → chapters: `reconstructPdfDocument` also returns where each page starts; `src/core/parsers/pdfOutline.ts` points each outline entry at its heading on that page, or at the page start. New journey `e2e/cuj-14-pdf-contents.spec.ts`.
- `tokens.css` split into tokens, base, controls and per-feature files (IMP-09), imported in the old cascade order from `src/styles/index.css`; the built CSS is byte-identical.
- CI budgets: `npm run budgets` (gzip sizes in `scripts/budgets.json`) and Lighthouse CI (`lighthouserc.json`: performance ≥ 0.9, accessibility ≥ 0.95, best practices ≥ 0.9 on a mobile profile). `e2e/perf-library.spec.ts`: 50 books of 200,000 characters render in under 300 ms with the CPU slowed 4×.
- `dexie-react-hooks` 4.4, TypeScript 6.0 (`types` now listed in `tsconfig.json`). TypeScript 7 waits for `typescript-eslint` support.
- 1 M-character splitter test (`splitter.large.test.ts`).

## [0.24.0] — 2026-11-27

PDFs and web articles import well.

### Added

- PDFs now rebuild real paragraphs from line positions and indents, rejoin words hyphenated across lines (`сло-` / `во`) while keeping Ukrainian and English compound words intact (`науково-технічний`, `well-known`), and drop running headers, footers and page numbers.
- Web articles from older Ukrainian sites in Windows-1251 open without broken letters.
- Clearer, calmer messages when a website asks for a login or requires JavaScript, or when a very long article is trimmed to its first part.

### Changed

- News articles import with fewer menus, sidebars and "read also" blocks mixed into the text.

### Under the hood

- Hardened `/api/extract` (`IMP-01`): manual redirect loop (max 5 hops) with SSRF checks on every hop (IPv4, IPv6, IPv4-mapped IPv6, numeric hosts), 10 s timeout, 2 MB streamed byte cap, and optional Workers rate-limiting binding.
- Pure `src/core/parsers/pdfLayout.ts` with shared golden fixtures in `spec/parsers/pdf-cases.json` and Worker extraction/SSRF tests in `worker/extract.test.ts`.

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
