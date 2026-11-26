# Plyn roadmap: 0.19 → 0.30

Status: draft · 2026-11-26 · current release: **0.20.0**

This is a direction, not a promise. Each release gets its own short design in `docs/superpowers/specs/` before work starts, and the owner can reorder or cut anything.

Related documents:

- [TESTING.md](TESTING.md): the full test plan (every layer, tools, CI gates).
- [IMPROVEMENTS.md](IMPROVEMENTS.md): engineering improvements, referenced below as `IMP-xx`.
- [experiments/](experiments/README.md): time-boxed experiments, referenced below as `EXP-xx`.

## Rules for this roadmap

1. **Calm beats feature-rich.** No release adds more than one new control to a main screen. New options go to Settings first.
2. **Tests before change.** The first two releases build the safety net. Every later release has its own "Tests" line, and 0.30 adds no features: it is the quality gate.
3. **Experiments before risky features.** A feature that depends on an experiment waits for the experiment's decision. A "no" is a valid result.
4. **Max five items per release.** If a release grows, split it.
5. **Pushing to `main` is a production release.** Work happens on branches with a PR and green CI ([IMP-12](IMPROVEMENTS.md#imp-12-pull-request-workflow)).

Size is a rough guess in focused working days: **S** ≈ 1 day, **M** ≈ 2–4 days, **L** ≈ 1–2 weeks.

## Overview

| Version | Theme | Readers notice | New test layer | Size | Waits for |
|---|---|---|---|---|---|
| [0.19](#0190--safety-net-i-test-foundation) ✓ | Safety net I: test foundation | nothing | DOM, storage, property, coverage | M | – |
| [0.20](#0200--safety-net-ii-end-to-end-and-accessibility) ✓ | Safety net II: end-to-end & a11y | nothing | E2E, automated a11y, offline | M | 0.19 |
| [0.21](#0210--your-library-is-safe) | Your library is safe | yes | backup & migration compat | M | EXP-07 |
| [0.22](#0220--feels-like-an-app) | Feels like an app | yes | visual regression | M | 0.20 |
| [0.23](#0230--books-import-well) | Books import well | yes | parser golden files | M | EXP-04 |
| [0.24](#0240--pdfs-and-web-articles-import-well) | PDFs & web articles import well | yes | Worker runtime tests | L | EXP-01 |
| [0.25](#0250--light-and-fast) | Light and fast | faster | performance budgets | M | 0.22 (visual baseline) |
| [0.26](#0260--listening-upgraded) | Listening, upgraded | yes | TTS contract tests | M | EXP-02 |
| [0.27](#0270--reading-comfort-ii) | Reading comfort II | yes | – | M | EXP-03 |
| [0.28](#0280--accessibility-audit) | Accessibility audit | yes | manual assistive-tech runs | M | EXP-08 |
| [0.29](#0290--trust-privacy-security-about) | Trust: privacy, security, about | a little | security tests | S–M | EXP-10 |
| [0.30](#0300--quality-gate) | Quality gate | fewer bugs | all layers enforced, mutation | M | everything |

---

## 0.19.0 — Safety net I: test foundation

**Status: shipped.** Design: [specs/2026-11-26-v0.19-safety-net-design.md](superpowers/specs/2026-11-26-v0.19-safety-net-design.md). Moved on: sheet focus tests → 0.22 (with focus management); Settings language-switch component test → 0.20 (CUJ-1); 10 `jsx-a11y` warnings → 0.28.

**Goal:** the code that touches the reader's data (storage, backup, progress) is covered by tests that run on every pull request.

**Work:**

1. CI on pull requests: lint, typecheck, test, build ([IMP-10](IMPROVEMENTS.md#imp-10-lint-and-typecheck-scripts), [IMP-12](IMPROVEMENTS.md#imp-12-pull-request-workflow)).
2. Vitest split into a `node` project (core) and a `dom` project (jsdom + Testing Library) ([TESTING.md § L2–L4](TESTING.md#l2-dom-unit-and-component-tests)).
3. Storage integration tests with `fake-indexeddb`: `db.ts`, backup export → import round trip, progress stats.
4. Property-based tests for the splitter: cards cover the text exactly, offsets only grow, offset → card → offset round-trips for every card length.
5. Coverage report (no threshold yet) and the baseline written into TESTING.md.

**Under the hood:** upgrade Vitest first, then dependency bot and Node pin ([IMP-03](IMPROVEMENTS.md#imp-03-dependency-hygiene)); fix the non-atomic stats update ([IMP-04](IMPROVEMENTS.md#imp-04-atomic-progress-stats)); remove the legacy Ukrainian `error` field from `/api/extract` ([IMP-11](IMPROVEMENTS.md#imp-11-remove-expired-compatibility-code)); start `CHANGELOG.md` ([IMP-14](IMPROVEMENTS.md#imp-14-changelog-and-release-notes)); first shared fixtures in `spec/` ([IMP-17](IMPROVEMENTS.md#imp-17-shared-spec-fixtures)).

**Done when:** a PR that breaks `createDocument`, backup import or the splitter fails CI. AGENTS.md "Tests" section describes the new layout.

## 0.20.0 — Safety net II: end-to-end and accessibility

**Status: shipped.** Design: [specs/2026-11-26-v0.20-safety-net-ii-design.md](superpowers/specs/2026-11-26-v0.20-safety-net-ii-design.md). Added beyond the plan: an iPhone (WebKit) project, an axe pass on the English UI, and the a11y fixes axe found (contrast in three themes, label-in-name, the library card's nested buttons). Kept as a documented exception for 0.28: the faded previous-card echo. Preview URLs need a first real PR to confirm the comment step.

**Goal:** the five journeys that matter most are checked in a real browser before every release, including offline.

**Work:**

1. Playwright against `vite preview`: Chromium, WebKit and a phone viewport.
2. Critical journeys CUJ-1…CUJ-5 from [TESTING.md § Critical journeys](TESTING.md#critical-user-journeys): first run, paste → read → reload resumes at the same place, card length change keeps the place, file import, offline after first load.
3. axe-core checks on the library, the reader and every sheet, in all four themes.
4. A keyboard-only journey (no mouse) through reading, bookmarks and settings.
5. E2E runs on every PR; `/api/extract` is mocked, so tests never hit the network.

**Under the hood:** a preview deployment per PR, so the release checklist runs on a real phone before merge ([IMP-13](IMPROVEMENTS.md#imp-13-preview-deployments)).

**Done when:** all CUJs are green on Chromium and WebKit, axe reports no serious or critical issues, and the release checklist in TESTING.md points to these runs.

## 0.21.0 — Your library is safe

**Status: in progress.** Design: [specs/2026-11-26-v0.21-library-safe-design.md](superpowers/specs/2026-11-26-v0.21-library-safe-design.md). Done: items 1–5, backup fixtures, CUJ-6, CUJ-11 and the app version in Settings. Left: CUJ-7 and CUJ-8, and the EXP-07 soak on real devices.

**Goal:** a reader never loses their texts, bookmarks or thoughts, even on iOS Safari.

**Experiment first:** [EXP-07 Storage durability](experiments/EXP-07-storage-durability.md).

**Readers get:**

1. The app asks the browser to keep its storage (`navigator.storage.persist()`), and Settings shows a calm line: how much is stored and whether it is protected.
2. Backup v2: Thought Parking notes and settings are included. v1 backups still import ([IMP-05](IMPROVEMENTS.md#imp-05-backup-v2)).
3. On phones, "Save backup" opens the share sheet, so the file can go to Files / iCloud / Drive in one step.
4. Deleting a document shows "Undo" for a few seconds instead of a confirm dialog.
5. If the app crashes, a calm screen offers to save a backup first ([IMP-07](IMPROVEMENTS.md#imp-07-error-boundary)).

**Tests:** a compatibility suite that imports every backup fixture (`spec/backups/v1-*.json`, `v2-*.json`); E2E for backup → wipe → restore; undo-delete journey.

**Done when:** a backup made in 0.18 restores fully in 0.21, and a v2 backup contains everything the reader created.

## 0.22.0 — Feels like an app

**Goal:** the installed PWA behaves like a native app: the back gesture, the screen, the icon and updates do what a reader expects.

**Readers get:**

1. Android back / browser back closes the open sheet, then returns from the reader to the library. It never exits the app mid-text.
2. The screen stays on while reading or listening (Screen Wake Lock), with a switch in Settings.
3. Proper home-screen icons on iOS and Android ([IMP-16](IMPROVEMENTS.md#imp-16-png-and-maskable-icons)).
4. Updates never interrupt reading: no reload mid-text, no broken lazy imports after a deploy ([IMP-15](IMPROVEMENTS.md#imp-15-service-worker-updates)).
5. Focus moves into a sheet when it opens and returns to its button when it closes.

**Under the hood:** split `ReaderView.tsx` into hooks before adding navigation ([IMP-08](IMPROVEMENTS.md#imp-08-split-readerview)); upgrade Vite, `vite-plugin-pwa` and icons, one PR each ([IMP-03](IMPROVEMENTS.md#imp-03-dependency-hygiene)).

**Tests:** visual regression baseline (themes × font presets × phone/desktop) before any CSS refactor; E2E for back-button flows; unit tests for the navigation state.

**Done when:** on a real Android phone, back never closes the app from the reader, and visual snapshots are stable in CI.

## 0.23.0 — Books import well

**Goal:** a long book opens fast and keeps its structure.

**Experiment first:** [EXP-04 FB2 and plain-text encodings](experiments/EXP-04-fb2-and-txt-encodings.md).

**Readers get:**

1. EPUB chapters: a "Contents" list in the bookmarks sheet that jumps to a chapter. Chapters are stored as character offsets, like bookmarks.
2. Title and author from EPUB metadata instead of the file name.
3. `.txt` files in any common encoding (UTF-8, UTF-16, Windows-1251) open without broken letters.
4. FB2 import, if EXP-04 says yes.
5. Big files parse off the main thread, so the screen never freezes during import.

**Tests:** golden-file tests for every parser (fixture in → expected text and chapters out), using public-domain books only; `spec/` gains parser cases for future native apps ([IMP-17](IMPROVEMENTS.md#imp-17-shared-spec-fixtures)).

**Done when:** a 1 MB EPUB imports without a frozen screen on a mid-range phone and its chapters match the book's table of contents.

## 0.24.0 — PDFs and web articles import well

**Goal:** text from PDFs and websites reads like the original: paragraphs, no page numbers, no broken words.

**Experiment first:** [EXP-01 PDF paragraph reconstruction](experiments/EXP-01-pdf-paragraphs.md). Optional, decided separately: [EXP-05 OCR for scanned PDFs](experiments/EXP-05-ocr-scanned-pdfs.md).

**Readers get:**

1. PDF paragraphs rebuilt from line positions; words split across lines (`сло-` / `во`) are joined; running headers, footers and page numbers are dropped.
2. Web articles from older Ukrainian sites in Windows-1251 import without broken letters.
3. Better article detection on news sites (fewer menus and "read also" blocks in the text).
4. Clear, calm messages when a site needs a login or JavaScript.

**Under the hood:** the extractor gets redirect checks, a timeout, a size limit and rate limiting ([IMP-01](IMPROVEMENTS.md#imp-01-harden-apiextract)).

**Tests:** the Worker runs in its real runtime (`@cloudflare/vitest-pool-workers`); a corpus of saved HTML pages and PDF fixtures with expected output; SSRF cases (redirect to a private address, IPv6, numeric hosts).

**Done when:** the fixture corpus passes and no test makes a real network call.

## 0.25.0 — Light and fast

**Goal:** a library of 50 books opens instantly and the bundle stays small.

**Readers get:** a faster library and a faster first open. Nothing new to learn.

**Work:**

1. Document metadata and text live in separate tables, so the library list never loads full texts (Dexie `version(4)`, with migration) ([IMP-06](IMPROVEMENTS.md#imp-06-split-metadata-from-text)).
2. Duplicate detection uses a content hash instead of scanning every text.
3. Splitting very long texts runs in a Web Worker.
4. Budgets in CI: JS and CSS size, Lighthouse performance / PWA / accessibility scores.
5. Split `tokens.css` into tokens and per-feature files, guarded by the visual baseline from 0.22 ([IMP-09](IMPROVEMENTS.md#imp-09-split-tokenscss)).

**Under the hood:** upgrade `dexie-react-hooks` with the migration and TypeScript after it ([IMP-03](IMPROVEMENTS.md#imp-03-dependency-hygiene)).

**Tests:** migration tests v1 → v4 and v3 → v4 with fake-indexeddb; benchmark for a 1 M-character text; bundle-size and Lighthouse gates.

**Done when:** the library with 50 fixture books renders in under 300 ms on a throttled phone profile, and budgets fail CI when exceeded.

## 0.26.0 — Listening, upgraded

**Goal:** listening helps reading: the reader can follow the spoken word with their eyes.

**Experiment first:** [EXP-02 TTS word highlighting](experiments/EXP-02-tts-word-highlighting.md).

**Readers get:**

1. The word being spoken is highlighted, where the browser's voice supports it. Off by default, a switch in Settings.
2. Choose a voice per content language (Ukrainian, English) in Settings.
3. Listening continues across cards without gaps; a clear stop point at the end of a chapter.

**Tests:** `services/speech/tts.ts` tested against a fake `speechSynthesis` (boundary events, cancel, session ids); E2E with a stubbed voice.

**Done when:** highlighting never lags more than one word behind on the browsers EXP-02 marked as supported, and is hidden where it is not.

## 0.27.0 — Reading comfort II

**Goal:** small, optional helps for dyslexia and time blindness, without new clutter.

**Experiment first:** [EXP-03 Ukrainian syllable hints](experiments/EXP-03-ukrainian-syllable-hints.md).

**Readers get:**

1. Syllable hints for long words (for example `са·мо·стій·ність`), if EXP-03 says yes. Off by default.
2. A calm "about 12 min left" estimate based on the reader's own pace, not on an average. Can be hidden.
3. At the end of a session, a quiet link to the thoughts parked during it.
4. Export Thought Parking to Markdown, like bookmarks.

**Tests:** syllable rules in `src/core/` with a large case list in `spec/`; time-left estimate unit tests (no pace yet, very slow, very fast, paused).

**Done when:** each new option is in Settings, off by default where it changes the text, and copy is reviewed for pressure or guilt.

## 0.28.0 — Accessibility audit

**Goal:** Plyn works with screen readers, zoom and system contrast settings, checked by people and tools.

**Experiment alongside:** [EXP-08 Sessions with real readers](experiments/EXP-08-reader-sessions.md).

**Work:**

1. Manual runs with VoiceOver (iOS, macOS), TalkBack (Android) and NVDA (Windows), following the script in [TESTING.md § L13](TESTING.md#l13-manual-assistive-technology-runs).
2. WCAG 2.2 AA review: 200 % zoom and 320 px reflow, text spacing override, forced colors / high contrast, reduced motion, target sizes.
3. Card changes are announced politely to screen readers, without repeating the toolbar.
4. Fix everything found; record what is intentionally different and why.

**Tests:** axe gate tightened to zero violations of any level that is not documented as a known exception; keyboard E2E for every feature.

**Done when:** the four assistive-tech runs complete with no blocker, and findings from EXP-08 sessions are triaged.

## 0.29.0 — Trust: privacy, security, about

**Goal:** a new reader, especially an English-speaking one, can see what Plyn does with their data and who made it.

**Experiment first:** [EXP-10 Localized install name and manifest](experiments/EXP-10-localized-manifest.md).

**Readers get:**

1. "About" in Settings: version, what's new, privacy in three sentences, font and library licenses.
2. A plain privacy page: texts stay on the device; URL import sends only the URL.
3. The install name and description in the reader's UI language, if EXP-10 finds a reliable way.

**Under the hood:** security headers and a Content Security Policy ([IMP-02](IMPROVEMENTS.md#imp-02-security-headers-and-csp)), dependency updates and audit ([IMP-03](IMPROVEMENTS.md#imp-03-dependency-hygiene)), `CHANGELOG.md` ([IMP-14](IMPROVEMENTS.md#imp-14-changelog-and-release-notes)).

**Tests:** header and CSP checks in E2E (no CSP violations in the console on any journey); `npm audit` in CI.

**Done when:** the CSP is enforced (not report-only) with no violations, and About shows the right version.

## 0.30.0 — Quality gate

**Goal:** no new features. Every test layer exists, runs in CI and blocks a broken release. This is the base for deciding what 1.0 means.

**Work:**

1. Coverage thresholds enforced ([TESTING.md § Coverage](TESTING.md#coverage-targets)).
2. Mutation testing on `src/core/` ([EXP-09](experiments/EXP-09-mutation-testing.md)); surviving mutants in the splitter and backup code are killed or explained.
3. The full compatibility matrix: every backup fixture, every Dexie version migration, every past `plyn_settings_v1` shape.
4. A bug bash on real devices with the [release checklist](TESTING.md#release-checklist), and fixes for everything above "cosmetic".
5. Docs refreshed: AGENTS.md, README, TESTING.md, this roadmap (with the plan after 0.30).

**Done when:** every row in the [TESTING.md layer table](TESTING.md#test-layers) says "enforced" and the release checklist passes on iPhone, Android and desktop.

---

## Parked (not planned before 0.30)

| Idea | Why parked |
|---|---|
| Sync between devices | Needs a design that keeps texts private (end-to-end encryption or device-to-device). Explored in [EXP-06](experiments/EXP-06-private-sync.md); backup via share sheet (0.21) covers the basic need. |
| Reminders and push notifications | Easily turns into pressure. Revisit only as strictly opt-in, after reader sessions (EXP-08). |
| Streaks, leaderboards, more achievements | Streak-shaming conflicts with the copy tone. The existing calm achievements stay. |
| AI summaries or simplification | Text would leave the device; accuracy can't be checked by the reader. |
| Colored overlays as a dyslexia "fix" | Evidence is weak. Calm themes already exist; any new tint would be a comfort option without claims. |
| Native iOS / Android apps | After 1.0. `spec/` fixtures keep the shared behaviour ready ([IMP-17](IMPROVEMENTS.md#imp-17-shared-spec-fixtures)). |
| OCR for scanned PDFs | Depends on [EXP-05](experiments/EXP-05-ocr-scanned-pdfs.md): size and phone speed may be too costly. |

## How a release moves

1. Pick the next version here. If it waits for an experiment, run the experiment first.
2. Write a short design in `docs/superpowers/specs/` (why, what, approaches considered).
3. Branch, build, add the tests listed under the version.
4. Open a PR; CI must be green. Check the preview on a phone ([IMP-13](IMPROVEMENTS.md#imp-13-preview-deployments)).
5. Bump `version`, update `CHANGELOG.md`, merge to `main` (this deploys), tag the release.
6. Tick the version here and move anything unfinished to a later version.
