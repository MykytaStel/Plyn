# EXP-02 TTS word highlighting

Status: not started · Feeds: [0.26](../ROADMAP.md#0260--listening-upgraded) · Time box: 1 day

## Question

On which browser + voice combinations does `SpeechSynthesisUtterance` fire `boundary` events with correct `charIndex` for Ukrainian and English text, so we can highlight the spoken word?

## Why it matters

Following the spoken word with the eyes can help some dyslexic readers connect sound and spelling. If boundaries are missing or drift, a highlight that lags behind the voice is worse than no highlight: it pulls attention away from the text.

## What we know

- The Web Speech API defines `boundary` events with `charIndex` and `charLength`, but support depends on the voice engine, not only on the browser.
- Guess: local system voices behave differently from network voices; some voices may emit sentence boundaries only.
- `src/services/speech/tts.ts` already tracks a session id to ignore stale events.

## Plan

1. Build a throwaway test page that speaks a fixed Ukrainian and English card and logs every `boundary` event with timestamps.
2. Run it on: iOS Safari, macOS Safari, Android Chrome, desktop Chrome (Windows or macOS), desktop Firefox. Try each available Ukrainian and English voice.
3. For each combination record: events fire (yes/no), word or sentence granularity, `charIndex` correct, drift at the end of a 300-character card.
4. Check behaviour with rates 0.75 and 1.5.

## Success criteria

- Supported = word-level events with correct `charIndex` and < 1 word drift over a long card at all four rates.
- The feature ships only if at least iOS Safari or Android Chrome is "supported" for Ukrainian.
- Unsupported combinations are detectable at runtime (no events within the first second), so the highlight hides itself.

## Constraints

- The highlight is off by default and lives in Settings.
- No network voices are required; Plyn must still work offline.
- Respects `prefers-reduced-motion` (no animated movement, only a static highlight).

## Result

## Decision
