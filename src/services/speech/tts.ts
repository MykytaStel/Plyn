/**
 * Легка озвучка поточної картки або окремого слова через Web Speech API
 * з підтримкою швидкості та безпечного авто-переходу.
 */

import {
  contentLanguageToSpeechTag,
  detectContentLanguage
} from '../../core/language/detectContentLanguage';

let currentSessionId = 0;

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function detectLanguage(text: string): string {
  return contentLanguageToSpeechTag(detectContentLanguage(text));
}

export function stopSpeaking(): void {
  currentSessionId += 1;
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Тихо озвучує одне складне слово (для допомоги при дислексії по подвійному тапу).
 */
export function speakSingleWord(word: string): void {
  const clean = word.trim();
  if (!isTtsSupported() || !clean) return;
  currentSessionId += 1;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = detectLanguage(clean);
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

export function speakCardText(
  text: string,
  options: {
    rate?: number;
    onStart?: () => void;
    onComplete?: () => void;
    onStop?: () => void;
  } = {}
): void {
  if (!isTtsSupported() || !text.trim()) return;

  currentSessionId += 1;
  const mySession = currentSessionId;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = detectLanguage(text);
  utterance.rate = options.rate ?? 1;

  utterance.onstart = () => {
    if (mySession === currentSessionId) {
      options.onStart?.();
    }
  };
  utterance.onend = () => {
    if (mySession === currentSessionId) {
      options.onComplete?.();
    }
  };
  utterance.onerror = () => {
    if (mySession === currentSessionId) {
      options.onStop?.();
    }
  };

  window.speechSynthesis.speak(utterance);
}
