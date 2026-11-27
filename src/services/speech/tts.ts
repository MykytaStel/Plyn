/**
 * Read-aloud through the Web Speech API: the only module that touches
 * `speechSynthesis`. A card is one utterance; the next card can be queued in
 * the same session so listening has no gaps (0.26). Word ranges come from
 * `boundary` events, where the voice reports them (EXP-02).
 */

import {
  contentLanguageToSpeechTag,
  detectContentLanguage,
  type ContentLanguage
} from '../../core/language/detectContentLanguage';
import { wordRangeAt, type WordRange } from '../../core/speech/wordRange';

/** No word event this long after `start` means the voice reports no positions. */
export const NO_WORDS_TIMEOUT_MS = 3000;
/** How long the first card waits for a late voice list when a voice is saved. */
export const VOICES_WAIT_MS = 500;

export interface VoiceOption {
  uri: string;
  name: string;
  /** False for network voices, which need a connection. */
  local: boolean;
}

export interface SpeakOptions {
  rate?: number;
  /** voiceURI; a voice missing on this device falls back to the browser default. */
  voiceURI?: string;
  onStart?: () => void;
  onWord?: (range: WordRange) => void;
  /** No word event within NO_WORDS_TIMEOUT_MS of start (only asked with onWord). */
  onNoWords?: () => void;
  onComplete?: () => void;
  onStop?: () => void;
}

let currentSessionId = 0;
/** Tells the running session it was cut off by another one (or by stop). */
let interruptCurrent: (() => void) | null = null;
/** Voices that sent no word positions this session, so later cards don't flash. */
const voicesWithoutWords = new Set<string>();
/**
 * Utterances handed to the engine. Chromium can collect an utterance nobody
 * references, and then its events never fire; queued cards wait a whole card.
 */
const pendingUtterances = new Set<SpeechSynthesisUtterance>();

/** For tests: utterances still referenced. */
export function pendingUtteranceCount(): number {
  return pendingUtterances.size;
}

/** Starts a new session: the previous one is told it stopped. */
function newSession(onInterrupt?: () => void): number {
  // The old session hears first: its handler may stop things itself.
  const previous = interruptCurrent;
  interruptCurrent = null;
  previous?.();
  currentSessionId += 1;
  interruptCurrent = onInterrupt ?? null;
  return currentSessionId;
}

function cancelEngine(): void {
  pendingUtterances.clear();
  window.speechSynthesis.cancel();
}

function enqueue(utterance: SpeechSynthesisUtterance): void {
  pendingUtterances.add(utterance);
  window.speechSynthesis.speak(utterance);
}

/** The voice list arrives late on Chrome and iOS: wait a little for a saved voice. */
function whenVoicesReady(voiceURI: string | undefined, run: () => void): void {
  if (!voiceURI || window.speechSynthesis.getVoices().length > 0) {
    run();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    off();
    clearTimeout(timer);
    run();
  };
  const off = onVoicesChanged(go);
  const timer = setTimeout(go, VOICES_WAIT_MS);
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function findVoice(voiceURI: string | undefined): SpeechSynthesisVoice | null {
  if (!voiceURI) return null;
  return window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI) ?? null;
}

function voiceMatches(voiceLang: string, lang: ContentLanguage): boolean {
  const tag = voiceLang.toLowerCase().replace('_', '-');
  return tag === lang || tag.startsWith(`${lang}-`);
}

export function listVoices(lang: ContentLanguage): VoiceOption[] {
  if (!isTtsSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => voiceMatches(v.lang, lang))
    .map((v) => ({ uri: v.voiceURI, name: v.name, local: v.localService }));
}

/** The voice list often arrives after the first call (Chrome, iOS). */
export function onVoicesChanged(cb: () => void): () => void {
  if (!isTtsSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener('voiceschanged', cb);
  return () => synth.removeEventListener('voiceschanged', cb);
}

export function stopSpeaking(): void {
  newSession();
  if (!isTtsSupported()) return;
  cancelEngine();
}

function createUtterance(
  text: string,
  lang: ContentLanguage,
  session: number,
  options: SpeakOptions
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = contentLanguageToSpeechTag(lang);
  utterance.rate = options.rate ?? 1;
  const voice = findVoice(options.voiceURI);
  if (voice) utterance.voice = voice;

  const voiceKey = voice ? voice.voiceURI : `default:${lang}`;
  const live = () => session === currentSessionId;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  utterance.onstart = () => {
    if (!live()) return;
    options.onStart?.();
    if (options.onWord && !voicesWithoutWords.has(voiceKey)) {
      timer = setTimeout(() => {
        timer = undefined;
        if (!live()) return;
        voicesWithoutWords.add(voiceKey);
        options.onNoWords?.();
      }, NO_WORDS_TIMEOUT_MS);
    }
  };
  utterance.onboundary = (event) => {
    if (!live() || event.name !== 'word' || voicesWithoutWords.has(voiceKey)) return;
    const range = wordRangeAt(text, event.charIndex, event.charLength);
    if (!range) return;
    clearTimer();
    options.onWord?.(range);
  };
  utterance.onend = () => {
    clearTimer();
    pendingUtterances.delete(utterance);
    if (live()) options.onComplete?.();
  };
  utterance.onerror = () => {
    clearTimer();
    pendingUtterances.delete(utterance);
    if (!live()) return;
    if (interruptCurrent === options.onStop) interruptCurrent = null;
    options.onStop?.();
  };
  return utterance;
}

/** Speaks one card, cancelling anything spoken or queued before. */
export function speakCardText(text: string, options: SpeakOptions = {}): void {
  if (!isTtsSupported() || !text.trim()) return;
  const session = newSession(options.onStop);
  cancelEngine();
  whenVoicesReady(options.voiceURI, () => {
    if (session !== currentSessionId) return;
    enqueue(createUtterance(text, detectContentLanguage(text), session, options));
  });
}

/**
 * Appends a card to the current session: it starts right after the one
 * speaking. False if there was nothing to queue.
 */
export function queueCardText(text: string, options: SpeakOptions = {}): boolean {
  if (!isTtsSupported() || !text.trim()) return false;
  enqueue(createUtterance(text, detectContentLanguage(text), currentSessionId, options));
  return true;
}

function speakShort(text: string, lang: ContentLanguage, voiceURI: string | undefined, rate: number): void {
  const clean = text.trim();
  if (!isTtsSupported() || !clean) return;
  const session = newSession();
  cancelEngine();
  whenVoicesReady(voiceURI, () => {
    if (session !== currentSessionId) return;
    enqueue(createUtterance(clean, lang, session, { voiceURI, rate }));
  });
}

/** One hard word, quietly slower (double tap, a help for dyslexia). */
export function speakSingleWord(word: string, voiceURI?: string): void {
  speakShort(word, detectContentLanguage(word), voiceURI, 0.88);
}

/** A sample sentence right after a voice is chosen in Settings. */
export function speakPreview(text: string, lang: ContentLanguage, voiceURI?: string): void {
  speakShort(text, lang, voiceURI, 1);
}
