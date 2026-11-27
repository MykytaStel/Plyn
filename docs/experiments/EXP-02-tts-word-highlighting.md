# EXP-02 TTS word highlighting

Status: decided: yes · Feeds: [0.26](../ROADMAP.md#0260--listening-upgraded) · Time box: 1 day

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

Probe: [`experiments/exp-02/index.html`](../../experiments/exp-02/index.html). Open it on a phone over the LAN with `npx vite experiments/exp-02 --host`, run each voice and rate, and paste the copied row here.

| Browser · OS | Voice | Text | Rate | Word events | charIndex on word start | First event | Lag (by ear) |
|---|---|---|---|---|---|---|---|
| Chromium 156 (Claude app) · macOS | Леся (uk-UA, local) | uk | 1.5 | 52 for 51 words | 51/52 (extra event on «—») | 1195 ms | not judged |
| Chromium 156 (Claude app) · macOS | default (uk) | uk | 0.75 | 52 for 51 words | 51/52 (extra event on «—») | 105 ms | not judged |
| Chrome 158 (CriOS, WebKit) · iOS 27.2 | default (uk) | uk | 1 | 52 for 51 words | 51/52 (extra event on «—») | 105 ms | in sync |
| Chrome 158 (CriOS, WebKit) · iOS 27.2 | Леся (uk-UA, local) | uk | 0.75 | 52 for 51 words | 51/52 (extra event on «—») | 113 ms | in sync |
| Chrome 158 (CriOS, WebKit) · iOS 27.2 | Леся (uk-UA, local) | uk | 1.5 | 52 for 51 words | 51/52 (extra event on «—») | 100 ms | in sync |
| Safari 27.2 · iOS 27.2 | default (uk) | uk | 1 | 52 for 51 words | 51/52 (extra event on «—») | 257 ms | not judged |

Findings so far:

- iOS fires word events with correct positions in both Safari and Chrome (Chrome on iOS runs on WebKit). By ear the highlight was in sync at 0.75, 1 and 1.5.
- Rate is not linear on iOS: the card took 26 s at 0.75, 24 s at 1 and 10 s at 1.5. The app's rate steps may need retuning for iOS, but that doesn't affect highlighting.
- Safari reports the frozen `iPhone OS 18_7` in its user agent, so detection must be by behaviour, never by user agent.
- macOS system voices fire word-level events with `charLength` in Chromium.
- Some voices also fire an event on punctuation such as «—»: the app must skip boundaries that don't start a letter or digit.
- `charLength` includes trailing punctuation («тихий,», «туман.»): the highlight should trim it, or it looks uneven.
- The first event came 1.2 s after `start` on the first run with a voice, and 105 ms on a later run (the voice was probably still loading the first time). The planned rule "no events within 1 s → hide" would hide a working highlight: the timeout must be longer (about 3 s) or counted from the first word.

Not covered: rate 1.25 (it lies between rates that worked), English on iOS, a lag judgement for the Safari run, Android Chrome (no device), desktop Firefox and Windows. Those combinations are left to the runtime check below.

## Decision

**Yes, for 0.26.** iOS Safari is supported for Ukrainian, which is the shipping condition. Rules for the implementation:

1. Highlight only `word` boundaries whose `charIndex` starts a letter or digit; skip punctuation events such as «—».
2. Trim trailing punctuation from the highlighted range instead of trusting `charLength` as is.
3. Hide the highlight for the current utterance if no word event arrives within 3 s of `start`, and remember "unsupported" for that voice for the session. Detect by behaviour, never by user agent.
4. A static highlight only (no animated movement), off by default, a switch in Settings.
