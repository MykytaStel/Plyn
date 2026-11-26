# EXP-10 Localized install name and manifest

Status: not started · Feeds: [0.29](../ROADMAP.md#0290--trust-privacy-security-about) · Time box: 1 day

## Question

Can the installed app's name, description and install prompt follow the reader's UI language (Ukrainian or English), and what happens to an already installed app when the language changes?

## Why it matters

Today `vite.config.ts` hard-codes a Ukrainian manifest (`name`, `description`, `lang: 'uk'`). An English-speaking reader who installs Plyn sees a Ukrainian name and description. This was a deliberate non-goal in the i18n design until the English market launch; this experiment prepares that decision.

## What we know

- The manifest is a static file linked from `index.html`. Options: one manifest per language and swapping the `<link rel="manifest">` at runtime, or a language-neutral name ("Plyn") with a short English description.
- Guess: browsers read the manifest at install time; changing it later may not rename the installed app, and may differ between iOS and Android.

## Plan

1. Build two manifests on a branch and swap the link based on the saved UI language before install.
2. Install on iOS Safari, Android Chrome, desktop Chrome in each language; record the name and description shown.
3. Switch language after install and record whether anything changes.
4. Compare with the simplest option: neutral name "Plyn" and a bilingual or English description.

## Success criteria

- A per-platform table of what the reader sees.
- A recommendation that never shows a reader a name in a language they did not choose, or the simplest neutral option if swapping is unreliable.

## Constraints

- Default language stays Ukrainian (owner's decision in the i18n design).
- Works offline and with the existing Workbox setup.

## Result

## Decision
