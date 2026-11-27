/** Спокійний темп читання для комфорту очей і РДУГ (слів за хвилину) */
export const CALM_WORDS_PER_MINUTE = 180;

export function countWords(text: string): number {
  const matches = (text || '').trim().match(/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9'’ʼ-]+/g);
  return matches ? matches.length : 0;
}
