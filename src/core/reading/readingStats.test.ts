import { describe, expect, it } from 'vitest';
import { countWords, estimateReadingMinutes } from './readingStats';

describe('readingStats', () => {
  it('counts Ukrainian and Latin words accurately', () => {
    expect(countWords('Привіт, світ! Це Plyn — об’єкт 2026.')).toBe(6);
  });

  it('estimates total reading minutes', () => {
    const longText = Array.from({ length: 360 }, () => 'слово').join(' ') + '.';
    expect(estimateReadingMinutes(longText)).toBe(2);
  });
});
