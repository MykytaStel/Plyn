/**
 * Легка озвучка поточної картки через вбудований Web Speech API
 * з підтримкою швидкості та безпечного авто-переходу.
 */

let currentSessionId = 0;

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function detectLanguage(text: string): string {
  const cyrillicCount = (text.match(/[А-Яа-яІіЇїЄєҐґ]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  return cyrillicCount >= latinCount ? 'uk-UA' : 'en-US';
}

export function stopSpeaking(): void {
  currentSessionId += 1;
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
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
