/**
 * A scriptable stand-in for `speechSynthesis` (dom tests, 0.26). Nothing
 * happens on its own: a test fires start / word / end on the current
 * utterance. `cancel` drops the queue and fires nothing, as WebKit does.
 */

export class FakeUtterance {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((e: Event) => void) | null = null;
  onend: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onboundary: ((e: { name: string; charIndex: number; charLength?: number }) => void) | null = null;
  constructor(public text: string) {}
}

export interface FakeSpeech {
  /** Every utterance passed to speak(), in order. */
  spoken: FakeUtterance[];
  cancelCount: number;
  /** The utterance a real engine would be speaking now. */
  current(): FakeUtterance | undefined;
  start(): void;
  word(charIndex: number, charLength?: number, name?: string): void;
  end(): void;
  error(): void;
  setVoices(voices: Array<Partial<SpeechSynthesisVoice>>): void;
  uninstall(): void;
}

export function installFakeSpeech(voices: Array<Partial<SpeechSynthesisVoice>> = []): FakeSpeech {
  let list = voices as SpeechSynthesisVoice[];
  let queue: FakeUtterance[] = [];
  const listeners = new Set<() => void>();
  const fake: FakeSpeech = {
    spoken: [],
    cancelCount: 0,
    current: () => queue[0],
    start: () => queue[0]?.onstart?.(new Event('start')),
    word: (charIndex, charLength, name = 'word') =>
      queue[0]?.onboundary?.({ name, charIndex, charLength }),
    end: () => queue.shift()?.onend?.(new Event('end')),
    error: () => queue.shift()?.onerror?.(new Event('error')),
    setVoices: (next) => {
      list = next as SpeechSynthesisVoice[];
      for (const l of listeners) l();
    },
    uninstall: () => {
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  };
  const synth = {
    speak: (u: FakeUtterance) => {
      fake.spoken.push(u);
      queue.push(u);
    },
    cancel: () => {
      fake.cancelCount += 1;
      queue = [];
    },
    getVoices: () => list,
    addEventListener: (_type: string, cb: () => void) => void listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => void listeners.delete(cb)
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = FakeUtterance;
  return fake;
}

/** A voice as the engines report it. */
export function voice(voiceURI: string, lang: string, localService = true): Partial<SpeechSynthesisVoice> {
  return { voiceURI, name: voiceURI, lang, localService, default: false };
}
