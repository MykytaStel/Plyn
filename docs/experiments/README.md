# Experiments

Status: draft · 2026-11-26 · part of the [roadmap](../ROADMAP.md)

An experiment answers one question before Plyn commits to a feature. It is time-boxed, it can end in "no", and its code is thrown away or kept only if it is clean. A feature in the roadmap that waits for an experiment does not start until the experiment has a decision.

## Index

| ID | Question | Feeds | Time box | Status |
|---|---|---|---|---|
| [EXP-01](EXP-01-pdf-paragraphs.md) | Can we rebuild PDF paragraphs from text positions? | 0.24 | 2 days | not started |
| [EXP-02](EXP-02-tts-word-highlighting.md) | Which browsers report spoken-word positions reliably? | 0.26 | 1 day | not started |
| [EXP-03](EXP-03-ukrainian-syllable-hints.md) | Can rule-based Ukrainian syllable hints be accurate and calm? | 0.27 | 2 days | not started |
| [EXP-04](EXP-04-fb2-and-txt-encodings.md) | Do readers need FB2, and can we decode old `.txt` files? | 0.23 | 1 day | done: yes to both |
| [EXP-05](EXP-05-ocr-scanned-pdfs.md) | Is offline OCR for scanned PDFs fast and small enough on a phone? | after 0.24 | 2 days | not started |
| [EXP-06](EXP-06-private-sync.md) | How could two devices share a library without exposing texts? | after 0.30 | 3 days (design only) | not started |
| [EXP-07](EXP-07-storage-durability.md) | Does the library survive browser storage eviction, especially on iOS? | 0.21 | 1 day + 2-week soak | not started |
| [EXP-08](EXP-08-reader-sessions.md) | Does Plyn actually help readers with ADHD or dyslexia? Where do they get stuck? | 0.28, 0.30 | 2 weeks (5 sessions) | not started |
| [EXP-09](EXP-09-mutation-testing.md) | Do our tests catch real bugs in `src/core/`? | 0.30 | 1 day | not started |
| [EXP-10](EXP-10-localized-manifest.md) | Can the installed app's name follow the UI language? | 0.29 | 1 day | not started |

Statuses: `not started` → `running` → `decided: yes` / `decided: no` / `decided: later`.

## How to run one

1. Copy the template below into a new file `EXP-xx-short-name.md` and add it to the index.
2. Work on a branch named `exp/xx-short-name`. Nothing from it merges to `main` without its own PR and tests.
3. Stop when the time box ends, even without a clear answer. "Not enough evidence" is a result: write down what would settle it.
4. Fill in **Result** and **Decision**, update the index, and update the roadmap version that waits for it.

## Template

```markdown
# EXP-xx Title

Status: not started · Feeds: 0.xx · Time box: N days

## Question
One question, answerable with yes / no / numbers.

## Why it matters
What readers get if the answer is yes, and what it costs if we guess wrong.

## What we know
Facts, constraints, links. Mark guesses as guesses.

## Plan
Numbered steps, each small.

## Success criteria
Concrete thresholds decided before starting.

## Constraints
Plyn invariants this must respect (offline, privacy, lazy loading, calm UI).

## Result
(filled in after)

## Decision
(yes / no / later, and what changes in the roadmap)
```
