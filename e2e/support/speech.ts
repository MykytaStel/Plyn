import type { Page } from '@playwright/test';

export interface SpeechLogEntry {
  event: 'speak' | 'cancel';
  text?: string;
  lang?: string;
  voiceURI?: string | null;
  rate?: number;
}

/**
 * A stub voice for journeys (0.26): replaces `speechSynthesis` before the app
 * loads. Utterances play from a queue; each fires `start`, one `word`
 * boundary per word every `wordMs`, then `end`. `window.__speech` logs
 * speak and cancel calls; `window.__speechPause = true` freezes playback,
 * and `pauseAfterWords` sets it after that many words (stable screenshots).
 */
export async function installStubSpeech(
  page: Page,
  { wordMs = 30, pauseAfterWords = 0 } = {}
): Promise<void> {
  await page.addInitScript(
    ({ wordMs, pauseAfterWords }) => {
      let wordsSpoken = 0;
      type Utterance = {
        text: string;
        lang: string;
        rate: number;
        voice: { voiceURI: string } | null;
        onstart?: (e: Event) => void;
        onend?: (e: Event) => void;
        onerror?: (e: Event) => void;
        onboundary?: (e: { name: string; charIndex: number; charLength: number }) => void;
      };
      const w = window as unknown as {
        __speech: unknown[];
        __speechPause: boolean;
        SpeechSynthesisUtterance: unknown;
      };
      w.__speech = [];
      w.__speechPause = false;
      const queue: Utterance[] = [];
      let generation = 0;
      const voices = [
        { voiceURI: 'stub-uk', name: 'Stub UK', lang: 'uk-UA', localService: true, default: true },
        { voiceURI: 'stub-en', name: 'Stub EN', lang: 'en-US', localService: true, default: false }
      ];
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      async function play(gen: number) {
        while (queue.length && gen === generation) {
          const u = queue[0];
          u.onstart?.(new Event('start'));
          for (const m of u.text.matchAll(/[\p{L}\p{N}'’-]+/gu)) {
            do await wait(wordMs);
            while (w.__speechPause && gen === generation);
            if (gen !== generation) return;
            u.onboundary?.({ name: 'word', charIndex: m.index ?? 0, charLength: m[0].length });
            wordsSpoken += 1;
            if (pauseAfterWords && wordsSpoken === pauseAfterWords) w.__speechPause = true;
          }
          await wait(wordMs);
          if (gen !== generation) return;
          queue.shift();
          u.onend?.(new Event('end'));
        }
        playing = false;
      }
      let playing = false;

      class StubUtterance {
        lang = '';
        rate = 1;
        voice = null;
        constructor(public text: string) {}
      }
      w.SpeechSynthesisUtterance = StubUtterance;
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          speak(u: Utterance) {
            w.__speech.push({ event: 'speak', text: u.text, lang: u.lang, voiceURI: u.voice?.voiceURI ?? null, rate: u.rate });
            queue.push(u);
            if (!playing) {
              playing = true;
              void play(generation);
            }
          },
          cancel() {
            w.__speech.push({ event: 'cancel' });
            generation += 1;
            queue.length = 0;
            playing = false;
          },
          getVoices: () => voices,
          addEventListener() {},
          removeEventListener() {}
        }
      });
    },
    { wordMs, pauseAfterWords }
  );
}

export function speechLog(page: Page): Promise<SpeechLogEntry[]> {
  return page.evaluate(() => (window as unknown as { __speech: SpeechLogEntry[] }).__speech);
}
