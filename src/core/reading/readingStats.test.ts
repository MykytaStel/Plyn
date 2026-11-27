import { describe, expect, it } from 'vitest';
import { countWords } from './readingStats';

describe('readingStats', () => {
  it('counts Ukrainian and Latin words accurately', () => {
    expect(countWords('Привіт, світ! Це Plyn — об’єкт 2026.')).toBe(6);
  });
});
