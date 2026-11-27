/** Спокійний темп читання для комфорту очей і РДУГ (слів за хвилину) */
export const CALM_WORDS_PER_MINUTE = 180;

export function countWords(text: string): number {
  const matches = (text || '').trim().match(/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9'’ʼ-]+/g);
  return matches ? matches.length : 0;
}

/**
 * Орієнтовний час читання тексту в хвилинах (мінімум 1 хв для непорожнього тексту).
 */
export function estimateReadingMinutes(text: string): number {
  return minutesForWords(countWords(text));
}

/** Reading time for a known word count (the library stores it, 0.25). */
export function minutesForWords(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / CALM_WORDS_PER_MINUTE));
}
