/**
 * Легка озвучка поточної картки через вбудований Web Speech API.
 */

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function detectLanguage(text: string): string {
  const cyrillicCount = (text.match(/[А-Яа-яІіЇїЄєҐґ]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  return cyrillicCount >= latinCount ? 'uk-UA' : 'en-US';
}

export function stopSpeaking(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
}

export function speakCardText(
  text: string,
  callbacks: { onStart?: () => void; onEnd?: () => void } = {}
): void {
  if (!isTtsSupported() || !text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = detectLanguage(text);
  utterance.rate = 0.96;

  utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = () => callbacks.onEnd?.();

  window.speechSynthesis.speak(utterance);
}
