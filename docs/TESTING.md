# Plyn test plan

Status: draft · updated for 0.22.0 · part of the [roadmap](ROADMAP.md)

**Goal for 0.30:** every layer below exists, runs automatically where it can, and blocks a broken release. Readers trust Plyn with their texts and their progress, so the tests protect those first.

## Where we are (0.22.0)

- New in 0.20: L7 and L8. Playwright runs CUJ-1…5, an axe scan of every screen and sheet in all four themes (and the English UI), and a keyboard-only journey, against the production build with its service worker. Projects: Desktop Chromium, Desktop WebKit, Pixel 7 (Chromium), iPhone 14 (WebKit); 56 runs, about 1.5 min locally. Every PR also gets a preview URL ([IMP-13](IMPROVEMENTS.md#imp-13-preview-deployments)).
- Findings fixed in 0.20: muted text, the paper accent, the first-card hint and achievement toasts were below 4.5:1 contrast in some themes; four buttons had a name that did not contain their visible text; the library card was a `role="button"` with buttons inside it; offline URL import blamed the site; a reload within 250 ms of a swipe lost that card (now journaled in `plyn_progress_journal_v1`).
- Vitest: 27 test files, 142 tests, in two projects: `node` (core, storage, worker, property, spec) and `dom` (jsdom + Testing Library). Run time about 1.5 s.
- New in 0.19: L0 (ESLint + typecheck in CI), L2 (EPUB parser, onboarding component), L3 (`db.ts`, backup round trip, reader store with `fake-indexeddb`), L4 (`fast-check` properties for the splitter, sentences, anchor, language detection, backup validation), more L5 fixtures (`spec/anchor-cases.json`, `sentence-cases.json`, `language-cases.json`).
- Findings fixed in 0.19: lost stats updates under concurrency ([IMP-04](IMPROVEMENTS.md#imp-04-atomic-progress-stats)); splitter offsets drifting when sentences had no space between them, and leading `?` / `…` being dropped (now cards are exact slices of the normalized text).
- New in 0.21: L5 backup fixtures (`spec/backups/`), CUJ-6 (backup → wipe → restore, download on desktop and share sheet on phones), CUJ-7 (thought parking), CUJ-8 (bookmark note → Markdown) and CUJ-11 (delete → Undo), axe on the Undo toast. Vitest: 33 files, 172 tests; Playwright: 76 runs.
- New in 0.22: L9 visual regression (`e2e/visual.spec.ts`, 48 snapshots on Chromium desktop and Pixel 7), CUJ-9 (back button), CUJ-10 (share target), Screen Wake Lock, a service worker update arriving mid-text, and the manifest icons. Unit tests for the back stack, wake lock and lazy-chunk retry; a component test for sheet focus. Vitest: 38 files, 197 tests; Playwright: 236 runs (visual and some PWA checks on Chromium only).
- Not covered yet: TTS and audio services (stubbed out of the journeys), the error screen in a browser (component test only), Firefox.
- CI: `ci.yml` runs `checks` (lint, typecheck, tests with coverage, build) and then `e2e` (Playwright) on every pull request; `deploy.yml` reuses it, so production deploys only after both. `preview.yml` uploads a Worker version per PR and comments its URL.
- Known lint warnings (not blocking): 7 `jsx-a11y` warnings for pointer-only click targets (progress bar, card feed, words), left for the 0.28 audit.

### Coverage baseline (0.19.0, v8, lines / branches)

| Area | Lines | Branches |
|---|---|---|
| `src/core/` | 98 % | 83 % |
| `src/services/storage/` | 89 % | 89 % |
| other `src/services/` | 7 % | 2 % |
| `src/store/` | 29 % | 12 % |
| `src/features/` | not measurable yet | – |
| `worker/` | 37 % | 34 % |
| **Total** | **63 %** | **61 %** |

`src/features/`: files no test imports are reported with 0 lines by v8, so the number would mislead. It becomes meaningful with component tests (L2) and E2E (L7). Run `npm run test:coverage` for the current numbers.

## Test layers

| # | Layer | Proves | Tool | Runs | Introduced | Enforced (blocks merge) |
|---|---|---|---|---|---|---|
| L0 | Static checks | types, hooks rules, a11y lint, no hard-coded copy | `tsc -b`, ESLint, i18n guard | every PR | 0.19 ✓ | 0.19 ✓ |
| L1 | Core unit | pure logic gives the right answer | Vitest (node) | every PR | exists | exists |
| L2 | DOM unit and components | parsers that need a DOM, component behaviour | Vitest (jsdom) + Testing Library | every PR | 0.19 ✓ | 0.19 ✓ |
| L3 | Storage integration | IndexedDB code saves, reads, migrates | Vitest + `fake-indexeddb` | every PR | 0.19 ✓ | 0.19 ✓ |
| L4 | Property-based | invariants hold for any input | `fast-check` | every PR | 0.19 ✓ | 0.19 ✓ |
| L5 | Contract and compatibility | shared behaviour, old backups, old schemas | Vitest + `spec/` fixtures | every PR | splitter exists; backups 0.21 | 0.21 |
| L6 | Worker runtime | `/api/extract` in the real Workers runtime | `@cloudflare/vitest-pool-workers` | every PR | 0.24 | 0.24 |
| L7 | End-to-end and PWA | real journeys in real browsers, offline | Playwright | every PR | 0.20 ✓ | 0.20 ✓ |
| L8 | Automated accessibility | no detectable a11y violations | `@axe-core/playwright` | every PR | 0.20 ✓ | 0.20 ✓ (serious+), 0.28 (all) |
| L9 | Visual regression | themes and fonts don't break by accident | Playwright screenshots (Linux CI) | every PR | 0.22 | 0.22 |
| L10 | Performance budgets | size and speed stay in budget | bundle-size script, Lighthouse CI | every PR / weekly | 0.25 | 0.25 |
| L11 | Security checks | SSRF blocked, headers and CSP present, no known-vulnerable deps | Vitest, Playwright, `npm audit` | every PR / weekly | 0.24 | 0.29 |
| L12 | Mutation testing | the tests actually catch bugs | Stryker (`src/core/`) | weekly | 0.30 ([EXP-09](experiments/EXP-09-mutation-testing.md)) | 0.30 (score floor) |
| L13 | Manual assistive-tech runs | works with real screen readers | VoiceOver, TalkBack, NVDA | 0.28, then before each minor release | 0.28 | release checklist |
| L14 | Release checklist on devices | installed PWA works on real phones | people, ~20 min | every release | 0.20 ✓ | every release |
| L15 | Reader sessions | the product actually helps | moderated sessions ([EXP-08](experiments/EXP-08-reader-sessions.md)) | 0.28, then twice a year | 0.28 | – |

"Enforced" means the CI job fails, or for manual layers, the release does not ship until it is done.

## Layers in detail

### L0 Static checks

- `npm run typecheck` (`tsc -b --noEmit`) and `npm run lint` in CI from 0.19 ([IMP-10](IMPROVEMENTS.md#imp-10-lint-and-typecheck-scripts)).
- ESLint with `typescript-eslint`, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`. Start with errors only for hooks rules and a11y; style is not a goal.
- The hard-coded Cyrillic guard (`src/i18n/noHardcodedCyrillic.test.ts`) stays. Since 0.19 its glob excludes `*.test.ts` (which also covers `*.dom.test.ts`) and `*.test.tsx`.
- Two `jsx-a11y` rules are off on purpose (`no-autofocus`: sheets focus their input; `label-has-associated-control`: switches use `htmlFor`), five are warnings until 0.28. Reasons are in `eslint.config.js`.

### L1 Core unit

- Every module in `src/core/` has a `*.test.ts` next to it (existing rule in AGENTS.md).
- Missing today: `core/parsers/epub.ts` and `core/parsers/pdf.ts` (they need L2 or a pure helper), `core/errors.ts`.
- When the PDF work lands (0.24), keep the paragraph logic as a pure function over text items in `src/core/`, so it is L1-testable without pdf.js.

### L2 DOM unit and component tests

- Vitest `projects`: `node` keeps `src/**/*.test.ts`; `dom` runs `src/**/*.test.tsx` and `src/**/*.dom.test.ts` in jsdom. jsdom, not happy-dom, because the EPUB parser needs reliable `application/xhtml+xml` parsing.
- Testing Library with `user-event`. Query by role and accessible name, which also checks accessibility.
- Assert copy through the dictionaries (`uk.settings.title`), never with literal strings, so a copy change does not break tests and the Cyrillic guard stays meaningful.
- First targets (0.19):
  1. ✓ EPUB parser with two fixture books (one EPUB 2, one EPUB 3), built in memory with `fflate`.
  2. Every sheet: opens with focus inside, closes on Escape, returns focus. (Moved to 0.22 with focus management.)
  3. Segmented controls behave as radio groups. ✓ `role="radio"` and `aria-checked` (onboarding); arrow keys: 0.28.
  4. Language switch changes the UI without reload. ✓ for onboarding; Settings sheet ✓ in a real browser (CUJ-1, 0.20).
  5. ✓ Onboarding: shown once, then never again (`plyn_onboarding_done_v1`).

### L3 Storage integration

- `fake-indexeddb/auto` in a setup file; a fresh database per test.
- Targets (0.19, all ✓ in `db.test.ts`, `backup.roundtrip.test.ts`, `useReaderStore.test.ts`):
  1. `createDocument`, `updateDocument` (bookmarks deduplicated and sorted), `renameDocument`, `removeDocument`.
  2. `findDocumentByText` and the "reopen instead of duplicate" path in the reader store.
  3. `recordProgressDelta`: totals, daily counts, achievements unlocked once, and concurrent calls not losing updates ([IMP-04](IMPROVEMENTS.md#imp-04-atomic-progress-stats)).
  4. Backup export → import round trip; import never deletes; newer `updatedAt` wins; stats merge takes the maximum.
  5. `migrateLegacyLocalSession` moves `plyn_session_v1` once and removes it.
- From 0.25: open a database created at each old `version(n)` and check the upgrade to the newest.

### L4 Property-based

`fast-check`, with a fixed seed in CI and the seed printed on failure. Since 0.19: `splitter.property.test.ts`, `core/properties.test.ts`, and the backup property in `backup.test.ts`. Properties 1–5 below all hold.

1. Splitter: for any text and any card length, `startOffset` never decreases, `endOffset` never passes the end of the normalized text, and every non-whitespace character belongs to exactly one card. Card offsets come from an `indexOf` search with a fallback (`splitter.ts:146`), so a failing property here is a finding about shared behaviour: discuss it and update `spec/splitter-cases.json`, don't weaken the property.
2. Offsets: for every card, `findCardIndexByOffset(card.startOffset)` returns that card. For any offset, switching card length and back lands on a card containing that offset.
3. Anchor: tokens joined give back the original text.
4. `validateBackupPayload`: any input either returns a valid payload or throws a `PlynError`, never anything else.
5. Language detection: never throws, always returns a known id.

### L5 Contract and compatibility

`spec/` holds JSON fixtures that future native apps will reuse. Tests read them, so web and native share one definition of correct.

- Exists: `spec/splitter-cases.json` (with `expectedOffsets` since 0.19), `spec/anchor-cases.json`, `spec/sentence-cases.json`, `spec/language-cases.json` (0.19, run by `src/core/spec.test.ts`).
- Backups (0.21): `spec/backups/v1-0.18.json` and `v2-0.21.json`, imported into an empty library by `src/services/storage/backup.compat.test.ts`. A new backup schema adds a fixture; old fixtures are never edited.
- Add ([IMP-17](IMPROVEMENTS.md#imp-17-shared-spec-fixtures)): `spec/parsers/` expected outputs (0.23).
- Compatibility matrix (complete by 0.30):
  1. Every backup fixture ever published imports without loss.
  2. Every Dexie version upgrades to the newest.
  3. Every past `plyn_settings_v1` shape loads with defaults merged.
  4. `/api/extract` responses always carry a `code` the client knows. ✓ 0.19 (`worker/extract.test.ts`).

### L6 Worker runtime

- Today `worker/extract.test.ts` runs in Node. From 0.24, run Worker tests in `workerd` with `@cloudflare/vitest-pool-workers`, so `fetch`, `TextDecoder` encodings and streaming behave like production.
- Outbound `fetch` is mocked with a fixture corpus (`test/fixtures/html/`). No test touches the network.
- Cases: article detection per fixture site, charsets (UTF-8, Windows-1251), redirects, timeouts, oversized pages, every error `code`.

### L7 End-to-end and PWA

- Playwright against `npm run build && npm run preview`, so the real service worker is tested.
- Projects: Desktop Chromium, Desktop WebKit, Pixel 7 (Chromium), iPhone 14 (WebKit). Firefox runs weekly, not blocking (from 0.30).
- `/api/extract` is mocked with `page.route`. Fonts are self-hosted, so no external requests are expected: every request to another host is aborted (`e2e/support/app.ts`).
- Each test starts in a fresh browser context (clean IndexedDB and localStorage). Onboarding is skipped unless a test asks for it (`test.use({ onboarding: true })`); settings can be seeded with `test.use({ settings: {...} })`.
- The service worker is blocked by default, because it hides requests from `page.route`. CUJ-5 turns it on and waits until it controls the page before going offline.
- Progress is checked in IndexedDB (`storedDocs`, `expectStoredOffset`), not only on screen: invariant 1 is about `charOffset`.
- Fixtures are built in memory (`e2e/support/fixtures.ts`): a numbered Ukrainian text, an EPUB zipped with `fflate`, a hand-written one-page PDF. No binary files in the repo.
- Copy comes from the dictionaries (`uk.library.start`), never literal strings.
- Run: `npm run test:e2e` (builds and starts `vite preview` on port 4173; reuses a running one locally). One project: `npx playwright test --project=chromium`. Debug: `npx playwright test --ui`. The first time: `npx playwright install chromium webkit`.
- Files: `e2e/cuj-*.spec.ts` (journeys), `e2e/a11y.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/visual.spec.ts`, PWA checks (`sw-update`, `wake-lock`, `pwa-icons`), helpers in `e2e/support/`.
- `sw-update.spec.ts` simulates a deploy by changing one revision character in `dist/sw.js` (same length) and restores it; `registration.update()` is not routable. It runs on desktop Chromium only, so no other run touches the file at once.
- Where Playwright cannot download its own browser (a sandbox), `PW_CHROMIUM_EXECUTABLE=/path/to/chromium` runs the Chromium projects on a local one. Pixel output may then differ slightly from CI.

### L8 Automated accessibility

- `@axe-core/playwright` (WCAG 2.2 A/AA tags) scans onboarding (all steps), the library (empty and with a text), the reader, zen mode and every sheet (settings, awards, Thought Parking, tools, bookmarks), in all four themes, plus the English UI. Chromium projects only: the DOM is the same in every engine.
- 0.20: fail on `serious` and `critical`. 0.28: fail on any violation not listed in `e2e/a11y-exceptions.ts` with a reason. Today the list has one entry: the faded previous-card echo (`.card-context`, decorative and `aria-hidden`).
- Keyboard journey (desktop projects): add a text with Tab only, read with Space / Shift+Space / arrows / j / k, toggle bookmark, anchor, sentence focus and Thought Parking by physical key in Latin and Ukrainian layouts, open bookmarks and settings with Enter, close with Escape, reopen the text from the library.

### L9 Visual regression

- Since 0.22: `e2e/visual.spec.ts`, Playwright `toHaveScreenshot()` on Chromium desktop and Pixel 7: the reader card with Ukrainian and English text in 4 themes × 4 font presets, the empty library and the reader settings sheet per theme (48 images). Animations off, caret hidden, `maxDiffPixelRatio: 0.01`; the storage line is masked.
- Runs on Linux in CI, so font rendering is stable. Snapshots change only on purpose: `npm run test:visual:update` locally, or the manual "Visual baseline" workflow, which renders them on the CI runner and uploads them. Updated images are reviewed in the PR like code.
- Required before splitting `tokens.css` ([IMP-09](IMPROVEMENTS.md#imp-09-split-tokenscss)).

### L10 Performance budgets

Starting budgets (adjust after measuring in 0.25):

| Budget | Limit |
|---|---|
| Initial JS (gzip) | measured in 0.25, then +5 % max per release |
| `pdfjs-dist` | never in the initial bundle (lazy-load invariant) |
| Lighthouse performance (mobile) | ≥ 90 |
| Lighthouse accessibility | 100 |
| Lighthouse PWA / best practices | ≥ 90 |
| Split 1 M characters | < 500 ms in a Web Worker on CI hardware |
| Library with 50 books, first render | < 300 ms on a throttled phone profile |

### L11 Security checks

1. SSRF (0.24): private IPv4 and IPv6, IPv4-mapped IPv6, numeric and decimal hosts, `localhost.` with a trailing dot, and a public URL that redirects to any of these.
2. Limits (0.24): slow upstream hits the timeout; huge page hits the size limit; both return a calm `code`.
3. Headers (0.29): CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` present on HTML responses.
4. CSP (0.29): no CSP violation in the console during any E2E journey.
5. Dependencies: `npm audit --audit-level=high` weekly, blocking from 0.29.

### L12 Mutation testing

Stryker with the Vitest runner on `src/core/` and `src/services/storage/backup.ts`, weekly. [EXP-09](experiments/EXP-09-mutation-testing.md) decides whether it is worth it and sets the score floor.

### L13 Manual assistive-technology runs

Run with VoiceOver on iPhone, VoiceOver on macOS, TalkBack on Android and NVDA with Firefox or Chrome on Windows. Each run: about 30 minutes. Record results in the release PR.

1. Open the app. The library title and each document's name and progress are announced.
2. Open a document. The first card's text is read once; the toolbar is not re-read on every card.
3. Move to the next card (swipe gesture or keyboard). The new card is announced politely.
4. Add a bookmark with a note. The state change is announced.
5. Park a thought and return to the same card.
6. Open Settings, change the font and theme, close. Focus returns to the Settings button.
7. Start read-aloud. The screen reader and TTS do not talk over each other in a way that blocks use.
8. At 200 % zoom and with system "larger text": no clipped controls, no horizontal scroll in the reader.

### L14 Release checklist on devices

See [Release checklist](#release-checklist) below.

### L15 Reader sessions

Moderated sessions with readers who have ADHD or dyslexia. Not a pass/fail gate: findings become issues. Method and ethics in [EXP-08](experiments/EXP-08-reader-sessions.md).

## Critical user journeys

E2E (L7) covers these. Each journey is one spec file (`e2e/cuj-<n>-*.spec.ts`). ✓ = in CI.

| ID | Journey | From |
|---|---|---|
| CUJ-1 | First run: onboarding → sample text → first card; switch UI to English and back | 0.20 ✓ |
| CUJ-2 | Paste text → read 10 cards → reload → the same card is on screen (same `charOffset`) | 0.20 ✓ |
| CUJ-3 | Change card length mid-text → the same sentence stays on screen; bookmarks still point to the same text | 0.20 ✓ |
| CUJ-4 | Import `.epub` and `.pdf` fixtures → right title, right first card | 0.20 ✓ |
| CUJ-5 | Load once, go offline, reload → library and reading work; URL import shows the offline message | 0.20 ✓ |
| CUJ-6 | Backup → clear storage → restore → same library, bookmarks, notes and thoughts | 0.21 ✓ |
| CUJ-7 | Park a thought mid-text → find it in the library → return to the text | 0.21 ✓ |
| CUJ-8 | Bookmark with a note → export Markdown → file contains the note | 0.21 ✓ |
| CUJ-9 | Back button: sheet closes → reader closes → library stays | 0.22 ✓ |
| CUJ-10 | Share target: open `/?title=…&text=…` → the text lands in the import box | 0.22 ✓ |
| CUJ-11 | Delete a document → undo → it is back with its progress | 0.21 ✓ |
| CUJ-12 | Read aloud with auto-advance across three cards (stubbed voice) | 0.26 |

## Coverage targets

Coverage is a smoke alarm, not a goal. Thresholds rise slowly so tests stay meaningful.

| Area | 0.19 | 0.23 | 0.30 |
|---|---|---|---|
| `src/core/` lines / branches | report only (98 / 83) | 85 / 80 | 90 / 85 |
| `src/services/storage/` | report only (89 / 89) | 80 / 70 | 90 / 80 |
| other `src/services/` | report only | – | 70 / 60 |
| `src/store/` | report only | – | 70 / 60 |
| `src/features/` | report only | – | covered by CUJs and L2, no line threshold |
| `worker/` | report only | – | 85 / 80 |

## CI pipeline (target for 0.30)

On every pull request:

1. `checks` (≈ 2 min): `npm ci` → lint → typecheck → Vitest (node + dom, with coverage) → build → bundle budget. ✓ except the budget (0.25).
2. `e2e` (≈ 6 min, needs `checks`): Playwright on Chromium and WebKit (desktop and phone), axe, visual snapshots, against the built preview. ✓ except snapshots (0.22).
3. Preview deploy to a Workers preview URL, for checking on a real phone ([IMP-13](IMPROVEMENTS.md#imp-13-preview-deployments)). ✓ (`preview.yml`, alias `pr-<number>`).

On push to `main`: the same jobs, then deploy. Deploy needs both jobs green.

Weekly (scheduled): Firefox E2E, full Lighthouse run, mutation testing, `npm audit`, dependency update PRs.

## Rules

1. **A bug fix starts with a failing test** that reproduces it.
2. **No network in tests.** Mock `/api/extract` in E2E and upstream `fetch` in Worker tests.
3. **Fixtures are public domain or self-written.** For example, Ukrainian classics (Franko, Lesya Ukrainka, Kotsiubynsky) and Project Gutenberg texts. Never real users' texts.
4. **Flaky tests are fixed or quarantined within a day.** Quarantined tests (`test.fixme`) get an issue and are fixed or deleted within a week. 0.30 ships with zero quarantined tests.
5. **Snapshot and golden-file updates are reviewed like code.**
6. **Test names describe behaviour**, in English: `keeps the reading position when card length changes`.

## File layout (target)

```
src/**/*.test.ts         L1, L3, L4, L5  (node)
src/**/*.test.tsx        L2              (jsdom)
src/**/*.dom.test.ts     L2              (jsdom, no JSX)
test/setup-dom.ts        jsdom setup (Testing Library cleanup)
worker/**/*.test.ts      L6
e2e/*.spec.ts            L7, L8, L9
e2e/support/             helpers, fixtures loader
spec/                    shared JSON cases and backup fixtures (also for native apps)
test/fixtures/           binary and HTML fixtures (epub, pdf, fb2, txt, html)
```

## Release checklist

About 20 minutes. Before starting, the PR's `e2e` job must be green: it already covers first run, resume after reload, card length, EPUB/PDF import, offline, axe and the keyboard (CUJ-1…5). This checklist is for what a real phone adds: install, gestures, voices, airplane mode, update from the previous version.

Do it on the PR preview (the "Preview" comment on the PR, `pr-<number>` alias) or on production right after deploy, on one iPhone and one Android phone with the installed PWA. Write "checklist ok" and the devices in the release PR.

1. Update from the previous version: library, progress and bookmarks are still there.
2. Open a document, read 20 cards with swipes; the counter and progress move.
3. Change card length and font; the same text stays on screen.
4. Read one card aloud; double-tap a word to hear it.
5. Park a thought, add a bookmark with a note.
6. Import one file (EPUB or PDF) and one URL.
7. Turn on airplane mode, close and reopen the app: everything except URL import works.
8. Make a backup, then restore it.
9. Switch the UI language and back.
10. Glance at all four themes in the reader.
11. Android: in the reader, back closes an open sheet, then returns to the library; it never closes the app mid-text. iPhone: the edge swipe does the same.
12. The home-screen icon is the Plyn card, not a screenshot (iOS) or a cropped square (Android).
13. Read for two minutes without touching the screen: it does not dim.
14. With the previous version installed, open Plyn after the deploy: the library offers "Update now"; the reader is never interrupted.
