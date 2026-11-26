# EXP-07 Storage durability

Status: partly done (0.21 ships the calls; the device soak is pending) · Feeds: [0.21](../ROADMAP.md#0210--your-library-is-safe) · Time box: 1 day of setup + a 2-week soak

## Question

When does a browser delete Plyn's IndexedDB and localStorage, and does `navigator.storage.persist()` prevent it, on iOS Safari (tab and installed PWA), Android Chrome and desktop browsers?

## Why it matters

Plyn's library exists only on the device. If a browser evicts storage, a reader loses texts, progress, bookmarks and thoughts without warning. The roadmap's "Your library is safe" release depends on knowing the real risk per platform.

## What we know

- `navigator.storage.persist()` asks the browser to exempt the origin from eviction; `navigator.storage.persisted()` reports the state; `navigator.storage.estimate()` reports usage and quota.
- Plyn calls none of these today.
- Safari has a policy that can delete script-writable storage for sites not visited for a period of time; installed home-screen web apps are treated differently. Exact current behaviour must be verified on the current iOS version, not assumed.
- Chromium-based browsers grant persistence based on engagement signals (for example installation).

## Plan

1. Add a hidden diagnostics view on a branch: `persisted()`, `estimate()`, document count, last opened date.
2. Install the branch preview on: iPhone (Safari tab and home-screen app), Android Chrome (tab and installed), desktop Safari, Chrome, Firefox.
3. Call `persist()` on each and record the answer and any prompt shown.
4. Soak: leave each install unused for 2 weeks with a small library, then open it and record what survived.
5. Write a short per-platform table and recommended copy for Settings.

## Success criteria

- A table with "persist granted?" and "data survived 2 weeks?" for every platform above.
- A recommendation for 0.21: when to call `persist()`, what Settings says, and whether to suggest installing the app or making a backup on platforms that can't guarantee storage.

## Constraints

- No prompts or banners on the main screens. Any message lives in Settings, in calm wording, without fear.

## Result

0.21 shipped the diagnostics as a reader-facing line in Settings ("Your library": size and whether the browser promised to keep it), so the per-platform table can be filled from any PR preview or production install. The two-week soak on real devices has not been run yet.

## Decision

Interim, for 0.21 (see the [design](../superpowers/specs/2026-11-26-v0.21-library-safe-design.md)): call `persist()` quietly once the library has a text, except in Firefox, which shows a prompt; there the reader asks from Settings. Settings always points to the backup as the safe option. Revisit after the soak.
