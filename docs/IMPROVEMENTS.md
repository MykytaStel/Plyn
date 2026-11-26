# Engineering improvements

Status: draft · 2026-11-26 · part of the [roadmap](ROADMAP.md)

Things that make Plyn safer, faster or easier to change, without being features. Each item says what is wrong today (with the file), what to change, and which release it lands in. Line numbers are as of 0.18.0.

| ID | Item | Area | Lands in |
|---|---|---|---|
| [IMP-01](#imp-01-harden-apiextract) | Harden `/api/extract` | security | 0.24 |
| [IMP-02](#imp-02-security-headers-and-csp) | Security headers and CSP | security | 0.29 |
| [IMP-03](#imp-03-dependency-hygiene) | Dependency hygiene and major upgrades | security | 0.19 ✓ (Vitest 5, Dependabot, Node pin) → 0.25 (upgrades), 0.29 (audit gate) |
| [IMP-04](#imp-04-atomic-progress-stats) | Atomic progress stats | data | 0.19 ✓ |
| [IMP-05](#imp-05-backup-v2) | Backup v2 | data | 0.21 |
| [IMP-06](#imp-06-split-metadata-from-text) | Split metadata from text | data, performance | 0.25 |
| [IMP-07](#imp-07-error-boundary) | Error boundary | data, UX | 0.21 |
| [IMP-08](#imp-08-split-readerview) | Split `ReaderView` | code health | 0.22 |
| [IMP-09](#imp-09-split-tokenscss) | Split `tokens.css` | code health | 0.25 |
| [IMP-10](#imp-10-lint-and-typecheck-scripts) | Lint and typecheck scripts | code health | 0.19 ✓ |
| [IMP-11](#imp-11-remove-expired-compatibility-code) | Remove expired compatibility code | code health | 0.19 ✓ (`error` field); legacy session: 1.0 |
| [IMP-12](#imp-12-pull-request-workflow) | Pull request workflow | delivery | 0.19 ✓ (CI on PRs; branch protection: owner, in GitHub settings) |
| [IMP-13](#imp-13-preview-deployments) | Preview deployments | delivery | 0.20 ✓ |
| [IMP-14](#imp-14-changelog-and-release-notes) | Changelog and release notes | delivery | 0.19 ✓ (file), 0.29 (in app) |
| [IMP-15](#imp-15-service-worker-updates) | Service worker updates | PWA | 0.22 |
| [IMP-16](#imp-16-png-and-maskable-icons) | PNG and maskable icons | PWA | 0.22 |
| [IMP-17](#imp-17-shared-spec-fixtures) | Shared spec fixtures | portability | 0.19 ✓ (anchor, sentence, language) → 0.30 |

## Security

### IMP-01 Harden /api/extract

**Today** (`worker/index.ts`):

1. `isBlockedHostname` (line 7) checks the hostname of the first URL only, and `fetch` uses `redirect: 'follow'` (line 184). A public URL that redirects to a blocked address is not re-checked. IPv6 ranges other than `::1`, IPv4-mapped IPv6, numeric hosts like `http://2130706433/` and `localhost.` with a trailing dot are not blocked.
2. No timeout and no size limit: `upstream.text()` (line 196) reads the whole response into memory.
3. The response is decoded as UTF-8 regardless of the page's charset, so Windows-1251 pages arrive broken.
4. Text is cut at 120 000 characters (line 210) without telling the reader.
5. No rate limit on the endpoint.

**Change:** follow redirects manually (`redirect: 'manual'`, max 5 hops, check every hop); block private, loopback and link-local ranges for IPv4 and IPv6 after normalizing the host; `AbortSignal.timeout()` and a streamed read with a byte cap; decode with the charset from `Content-Type` or `<meta charset>` (verify which encodings `TextDecoder` supports in `workerd`); return `truncated: true` so the client can say "the article was long, here is the first part"; add a Workers rate-limiting binding.

**Note:** Cloudflare Workers can't reach private networks the way a server in a data centre could, so the practical risk is lower. This is defence in depth, and the tests (TESTING.md L11) document the intent.

### IMP-02 Security headers and CSP

**Today:** the Worker returns static assets as they are (`env.ASSETS.fetch`, `worker/index.ts`), with no Content Security Policy or other security headers.

**Change:** add `Content-Security-Policy` (start in report-only mode, then enforce), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (deny camera, geolocation and so on). Check that the pdf.js worker, self-hosted fonts, inline styles from React and the service worker all still work.

### IMP-03 Dependency hygiene

**Today:** no automated dependency updates; no `engines` field or `.nvmrc` (CI and AGENTS.md say Node 22). `npm outdated` on 2026-11-26 shows several majors behind:

| Package | Installed | Latest | Upgrade in | Why then |
|---|---|---|---|---|
| `vitest` | 3.2 | 5.1 | 0.19, first step | dev-only; build the new test setup on the current version, not twice |
| `vite` + `@vitejs/plugin-react` | 6.4 + 4.7 | 8.4 + 6.3 | 0.22 | after E2E exists (0.20); together, one PR |
| `vite-plugin-pwa` | 0.21 | 2.0 | 0.22 | same release as the service worker update work ([IMP-15](#imp-15-service-worker-updates)) |
| `lucide-react` | 0.475 | 1.81 | 0.22 | after the visual baseline, which catches changed icons |
| `dexie-react-hooks` | 1.1 | 4.4 | 0.25 | same release as the Dexie `version(4)` migration |
| `typescript` | 5.9 | 7.0 | 0.25 | check `tsc -b` and editor support with the new compiler first |

**Change:** Dependabot (or Renovate) with weekly grouped PRs for minor and patch updates; `"engines": { "node": ">=22" }` and `.nvmrc`; `npm audit --audit-level=high` weekly, blocking from 0.29. Major upgrades follow the table above, one per PR, each with its release notes read first.

## Data

### IMP-04 Atomic progress stats

**Today:** `recordProgressDelta` (`src/services/storage/db.ts:141`) reads stats, adds the delta and writes back, outside a transaction. The comment above it says "atomically", but two calls close together (fast swipes plus a TTS event) can both read the same old value, and one update is lost.

**Change:** wrap the read-modify-write in `db.transaction('rw', db.stats, …)`. Add an L3 test that fires 20 concurrent deltas and expects the exact total.

### IMP-05 Backup v2

**Today:** `PlynBackupPayload` (`src/core/models/types.ts`) has `schemaVersion: 1` with documents and stats only. Thought Parking notes (`db.thoughts`) and settings are not in the backup, so a restore loses them.

**Change:** `schemaVersion: 2` with `thoughts` and `settings` (settings optional on import: the reader may not want another device's theme; decide in the 0.21 design). Keep importing v1 (invariant 5). Save fixture backups of both versions in `spec/backups/` and test them forever (TESTING.md L5).

### IMP-06 Split metadata from text

**Today:** the library list runs `db.documents.orderBy('updatedAt').reverse().toArray()` (`src/features/library/LibraryView.tsx:71`), which loads the full text of every book to show titles and progress. `findDocumentByText` (`db.ts:48`) compares the full text of every document to detect duplicates.

**Change:** a new Dexie `version(4)` with a `texts` table (`id → text`) and a light `documents` table (title, progress, counts, a `textHash`). Migrate existing rows in the upgrade function. Duplicates are found by `textHash`, then confirmed by comparing text. Backups keep their shape (text inline), so this is invisible to users and to native apps.

**Note:** invariant 3: never edit `version(1–3)`; add `version(4)` with an `upgrade()`. Test upgrades from every old version (TESTING.md L3).

### IMP-07 Error boundary

**Today:** `App.tsx` has no React error boundary. A render error shows a blank screen, and the reader cannot reach their data.

**Change:** a top-level error boundary with a calm screen: "Something went wrong. Your texts are safe on this device." plus two buttons: "Save a backup" (uses `exportLibraryBackup`, which does not depend on React state) and "Reload". Copy in both languages.

## Code health

### IMP-08 Split ReaderView

**Today:** `src/features/reader/ReaderView.tsx` is 813 lines: keyboard, swipe, TTS auto-advance, timers, eye-break reminder, sheets and rendering in one component.

**Change:** extract hooks (`useReaderKeyboard`, `useSwipe`, `useTtsAutoAdvance`, `useFocusTimer`, `useEyeBreak`) and keep `ReaderView` as composition. Do it after the E2E journeys exist (0.20) and before back-button navigation (0.22), which touches the same code. No behaviour change.

### IMP-09 Split tokens.css

**Today:** `src/styles/tokens.css` is 1755 lines: themes, variables and every component's styles.

**Change:** keep `tokens.css` for themes and variables; move component styles next to their features (`features/reader/reader.css` and so on), imported by the components. Only after the visual regression baseline (0.22), and in one PR per feature, so any snapshot diff is easy to trace.

### IMP-10 Lint and typecheck scripts

**Today:** `package.json` has no `lint` or `typecheck` scripts. Type errors are caught only by `npm run build`.

**Change:** add ESLint (flat config) with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`; scripts `lint` and `typecheck`; both in CI. Start with only the rules that catch bugs (hooks, a11y, no floating promises), not style.

### IMP-11 Remove expired compatibility code

**Today:**

1. `/api/extract` errors carry a Ukrainian `error` string next to `code` "for one release" (`worker/index.ts:130`) so clients on an older cached service worker still showed text. 0.17 and 0.18 have shipped since.
2. `migrateLegacyLocalSession` (`db.ts`) still moves the pre-Dexie `plyn_session_v1` on every start.

**Change:** remove the `error` field in 0.19 (clients use `code` since 0.17). Keep the legacy session migration until 1.0, then remove it with a note in the changelog.

## Delivery

### IMP-12 Pull request workflow

**Today:** `.github/workflows/deploy.yml` runs only on push to `main`, and pushing to `main` deploys to production. A broken commit is found by the deploy job, after it is already on `main`.

**Change:** a separate `ci.yml` on `pull_request` (lint, typecheck, tests, build; E2E from 0.20). Protect `main`: merge only through a PR with green checks. The deploy workflow stays as is but only runs after the same checks pass.

### IMP-13 Preview deployments

**Today:** the only way to try a change on a real phone is to deploy it to production.

**Change:** upload a Worker version for each PR (`wrangler versions upload`) and post its preview URL on the PR. Use it for the release checklist and for E2E against a deployed build. Check that previews never share storage with production (different origin) and that `/api/extract` limits apply there too.

### IMP-14 Changelog and release notes

**Today:** no `CHANGELOG.md`. Release history lives in commit messages and tags (`v0.16.0`…`v0.18.0`).

**Change:** `CHANGELOG.md` in the Keep a Changelog format, written for readers (what changed for them), starting with 0.19 and a short summary of 0.1–0.18. From 0.29, Settings → About shows the current version's notes.

## PWA

### IMP-15 Service worker updates

**Today:** `registerType: 'autoUpdate'` (`vite.config.ts:10`). A new service worker takes over open tabs. Not verified:

1. whether an update can reload the page while someone is reading;
2. whether a long-open tab can still lazy-load an old chunk (for example the PDF parser, `LibraryView.tsx:200`) after a deploy removed it.

**Change:** test both in E2E (0.22). If either fails: switch to a prompt-style update (a calm "New version ready, applies next time you open Plyn" line, no modal) and retry failed dynamic imports once after reloading the chunk list.

### IMP-16 PNG and maskable icons

**Today:** `index.html:14` points `apple-touch-icon` at an SVG, which iOS does not use for home-screen icons; the manifest has one SVG icon with `purpose: 'any maskable'`, which mixes two purposes in one image.

**Change:** add PNG icons: `apple-touch-icon` 180×180; manifest 192×192 and 512×512 (`any`) plus a separate 512×512 `maskable` with a safe zone. Optionally manifest `screenshots` for the richer Android install sheet. All match the Workbox `globPatterns` (`png` is already included).

## Portability

### IMP-17 Shared spec fixtures

**Today:** `spec/` has one file, `splitter-cases.json`. Native apps will need the same behaviour for anchors, sentences, language detection, offsets and backups.

**Change:** grow `spec/` release by release: `anchor-cases.json`, `sentence-cases.json`, `language-cases.json` (0.19); `backups/` (0.21); `parsers/` expected outputs (0.23); `syllable-cases.json` if EXP-03 ships (0.27). Each file has a short header describing its format, and a web test that runs every case (TESTING.md L5).
