# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) and human contributors working on **Plyn**.

## What Plyn is

Plyn is an offline-first PWA that splits long text (pasted text, web articles, `.pdf`, `.epub`) into short cards and shows them one at a time. It is built for readers with ADHD and dyslexia. The UI is Ukrainian-first, with English as a second language.

**Product principle: calm and uncluttered beats feature-rich.** Every new control competes for the attention of a reader who is easily overloaded. Before adding UI, ask whether the feature can live in Settings, be merged with an existing one, or be skipped. Polish over speed. There is no rush to a "v1".

## Commands

```bash
npm ci            # install (Node 22, same as CI)
npm run dev       # Vite dev server
npm test          # Vitest: node + dom projects (must pass)
npm run test:coverage  # tests with a coverage report in coverage/
npm run test:e2e  # Playwright: journeys, axe, keyboard, offline (builds first; must pass)
npm run lint      # ESLint: hooks, a11y, floating promises (must pass)
npm run typecheck # tsc -b --noEmit
npm run build     # tsc -b + vite build + PWA service worker (must pass)
npm run preview   # serve the production build locally
```

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before every commit, and `npm run test:e2e` before a PR that touches UI. CI runs all five on every pull request (e2e after the others), and every PR gets a preview URL (`.github/workflows/preview.yml`).

## Deployment

Every pull request runs `.github/workflows/ci.yml` (lint, typecheck, tests, build). Every push to `main` triggers `.github/workflows/deploy.yml`: the same checks → build → deploy to Cloudflare Workers (`wrangler.jsonc`). **Pushing to `main` is a production release.** Bump `version` in `package.json` for user-visible changes and add an entry to `CHANGELOG.md` (written for readers).

## Stack

- React 19, TypeScript (strict), Vite 6
- Zustand for state (`src/store/`)
- Dexie / IndexedDB for the library, stats and thoughts (`src/services/storage/db.ts`)
- `vite-plugin-pwa` (Workbox `generateSW`) for offline use and the Web Share Target
- Cloudflare Worker (`worker/index.ts`): serves static assets and `/api/extract` (URL → article text)
- Vitest (Node environment) for unit tests

## Layout

```
src/
  core/        Pure logic, no DOM or React. Splitter, anchor, parsers, presets, achievements, stats.
  features/    React UI by feature: library, reader, settings, onboarding, thoughts, achievements.
  services/    Side effects: storage (Dexie, localStorage, backup), speech (Web Speech TTS),
               audio (brown noise), extract (URL import client), sync (future contract only).
  store/       Zustand stores: reader session and settings.
  styles/      tokens.css (themes, CSS variables, all component styles), fonts.css (@font-face).
  assets/      Self-hosted fonts.
spec/          Shared JSON fixtures (splitter cases), meant to be reused by future native apps.
worker/        Cloudflare Worker.
```

Keep `src/core/` free of DOM, React and storage imports so that it stays testable and portable.

## Invariants (do not break)

1. **Progress is a character offset, not a card index.** `PlynDocument.charOffset` and `bookmarkOffsets` point into the *normalized* text (`normalizeText` in `src/core/splitter/splitter.ts`). Card length can change at any time, so never persist card indices as the source of truth.
2. **The splitter is shared behaviour.** If you change `splitTextIntoCards`, update `spec/splitter-cases.json` and keep every case green.
3. **Dexie schema changes need a new `this.version(n)`.** Never edit an existing version's stores. Database name: `plyn_library_v2`.
4. **localStorage keys are versioned**: `plyn_settings_v1`, `plyn_onboarding_done_v1`, `plyn_progress_journal_v1` (last reading place, applied on start if newer than IndexedDB). Changing a stored shape means a new key plus a migration.
5. **Backups stay compatible.** `PlynBackupPayload.schemaVersion` must be bumped and handled in `services/storage/backup.ts` when the shape changes (now 2: documents, stats, thoughts, settings). Every version still imports: add a fixture to `spec/backups/` for a new schema and never edit an old one.
6. **Everything works offline.** User text never leaves the device, except URL import, which sends only the URL to `/api/extract`. New assets must match the Workbox `globPatterns` in `vite.config.ts`.
7. **Heavy parsers are lazy-loaded.** `pdfjs-dist` (and any future OCR) must be loaded with dynamic `import()` only when used.

## Fonts

Fonts are chosen per script, using CSS per-glyph fallback:

| Preset (`data-font`) | Latin | Cyrillic |
|---|---|---|
| `sans` (default, also UI) | Fixel Text | Fixel Text |
| `hyperlegible` | Atkinson Hyperlegible | Fixel Text |
| `dyslexic` | OpenDyslexic | Andika |
| `serif` | Literata | Literata |

OpenDyslexic, Atkinson Hyperlegible and Lexend have **no Cyrillic glyphs**. They are kept for English text. Do not put a Latin-only font last in a stack used for Ukrainian. Before adding a font, check that it has Cyrillic (including `і ї є ґ`). Fixel Text is self-hosted under OFL 1.1 (`src/assets/fonts/fixel/OFL.txt`).

## Language and copy

- The UI is available in Ukrainian (default) and English. All UI strings live in `src/i18n/locales/{uk,en}.ts`. `uk.ts` is the source of truth, and `en.ts` must match its shape (TypeScript enforces this).
- Every new string needs both languages. Use `useI18n()` in components and `currentI18n()` in handlers and stores. Plurals go through `plural()` (Intl.PluralRules); numbers and dates go through Intl.
- `src/core/` stays language-free: it returns ids, dates and error codes (`PlynError`), never copy.
- `noHardcodedCyrillic.test.ts` fails if Cyrillic appears in `src/features/` or `src/core/` outside comments.
- Reader cards get `lang` from the *content* language, not the UI language (hyphenation and TTS depend on it).
- Code, identifiers, commit messages and docs: English. Existing Ukrainian code comments are fine to leave as they are.
- Copy tone: calm, short, second person ("ти"), no pressure or guilt (no streak-shaming).
- Don't claim scientific effects the evidence doesn't support. "Anchor" (bold word starts) is offered as a comfort option, not as a proven speed-up.

## Accessibility

- Every interactive element is keyboard-reachable and has an accessible name.
- The reader supports keyboard control (Space / arrows / j / k, plus single-letter toggles that work in both the Latin and Ukrainian layouts). Toggles match `KeyboardEvent.code` (physical key), so they work in any layout. Add new ones in `src/features/reader/shortcuts.ts`.
- Respect user settings for theme, spacing and column width. Don't hard-code font sizes inside reader cards.

## Tests

- Vitest has two projects (`vitest.config.ts`):
  - `node`: `src/**/*.test.ts` and `worker/**/*.test.ts`. Pure logic, storage, property-based and `spec/` contract tests.
  - `dom` (jsdom + Testing Library): `src/**/*.test.tsx` and `src/**/*.dom.test.ts`. Parsers that need a DOM, and components.
- Storage tests import `fake-indexeddb/auto` and reset `db` in `beforeEach` (see `src/services/storage/db.test.ts`).
- Property tests use `fast-check` with a fixed `seed`. A failing property is a finding about shared behaviour: fix the code or discuss and update `spec/`, never weaken the property.
- In component tests, query by role and accessible name, and take copy from the dictionaries (`uk.onboarding.skip`), never literal strings.
- Add a test for every change in `src/core/`, `src/services/storage/` and `worker/`. A bug fix starts with a failing test.
- Fixtures are public domain or self-written. No test touches the network.
- `npm run lint` (bug-catching rules only) and `npm run typecheck` run in CI with the tests. `npm run test:coverage` writes a report to `coverage/` (no threshold yet).
- E2E (Playwright, `e2e/`): critical journeys `cuj-*.spec.ts`, `a11y.spec.ts` (axe, fails on serious/critical) and `keyboard.spec.ts`, against the production build on Chromium, WebKit, Pixel 7 and iPhone 14. Use the fixture in `e2e/support/app.ts` (fresh storage, onboarding skipped, other hosts blocked, `/api/extract` mocked), build files in memory (`e2e/support/fixtures.ts`), and check progress in IndexedDB, not only on screen.
- A UI change keeps every journey green. A new screen or sheet gets an axe scan in `a11y.spec.ts`; a kept a11y finding goes into `e2e/a11y-exceptions.ts` with a reason.
- Still check UI changes by eye in `npm run dev`, and on a phone with the PR preview before release.
- The plan for the full test suite (layers, tools, CI gates, release checklist) is in `docs/TESTING.md`. The release plan is in `docs/ROADMAP.md`.

## Commits

- Conventional prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `ci:`, `docs:`.
- One logical change per commit. Don't commit `dist/`, `.env*`, `.wrangler/` or local agent files (`.claude/launch.json`, `.claude/settings.local.json`).
