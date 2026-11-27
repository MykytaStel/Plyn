# EXP-03 Ukrainian syllable hints

Status: in progress · Feeds: [0.27](../ROADMAP.md#0270--reading-comfort-ii) · Time box: 2 days

## Question

Can a small rule-based syllabifier in `src/core/` split Ukrainian (and English) words into syllables accurately enough, and can we display the hints in a way readers find calm, not noisy?

## Why it matters

Reading long words syllable by syllable is a common support technique for dyslexic readers in Ukrainian schools. A visible split (`са·мо·стій·ність`) could make long words less intimidating. A wrong split is worse than none: it teaches the wrong shape of the word.

## What we know

- Ukrainian syllable division is fairly regular: one vowel per syllable, with rules for consonant clusters, `й`, the soft sign and the apostrophe.
- Spoken syllables and hyphenation points differ. For reading support we want spoken syllables.
- English syllabification is irregular; a hyphenation dictionary (like Liang's patterns) is heavy. English may be out of scope.
- Guess: hints are most useful only for words with 4+ syllables, not every word.

## Plan

1. Write a list of 500 Ukrainian words with expected syllables (from school materials and dictionaries), including clusters, apostrophes, `дж` / `дз`, compound words.
2. Implement `splitSyllables(word, lang)` as a pure function and measure accuracy on the list.
3. Prototype three displays in the reader on a branch: middle dot, thin gap, alternating subtle weight. Only for words above a length threshold.
4. Show the prototype to 2–3 readers (can be combined with [EXP-08](EXP-08-reader-sessions.md)) and ask which, if any, they would keep on.

## Success criteria

- ≥ 98 % accuracy on the Ukrainian word list.
- At least 2 of 3 readers would keep one of the displays on for long texts.
- No measurable slowdown when rendering a card (< 2 ms per card).

## Constraints

- Off by default. Words keep their real characters, so copy, search, TTS and offsets are unaffected (hints are display-only: CSS or non-text spans).
- Works with the Anchor option at the same time, or the two are mutually exclusive by design.
- No claims of a proven speed-up in copy.

## Result

Interim (0.27): the rules and 535 cases are written and the owner accepted them, including the four debatable ones (doubled consonants not split, the apostrophe as й, open syllables, дж / дз never split). The splitter and three display prototypes (`?syllables=dot|gap|tone`) live on the `exp/03-syllable-hints` branch, where this file has the full result: 535 of 535 cases (consistency with the rules, not a dictionary check) and about 0.85 ms per 500-word card.

## Decision

Pending: the owner picks a display, or none, after trying them on a phone. Not shipped in 0.27; the `syllableHints` setting stays hidden.
