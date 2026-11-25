import { describe, expect, it } from 'vitest';
import { splitTextIntoCards } from '../splitter/splitter';
import {
  countWords,
  estimateReadingMinutes,
  estimateRemainingMinutes
} from './readingStats';

describe('readingStats', () => {
  it('counts Ukrainian and Latin words accurately', () => {
    expect(countWords('Привіт, світ! Це Plyn — об’єкт 2026.')).toBe(6);
  });

  it('estimates total and remaining reading minutes', () => {
    const longText = Array.from({ length: 360 }, () => 'слово').join(' ') + '.';
    expect(estimateReadingMinutes(longText)).toBe(2);

    const cards = splitTextIntoCards(longText, { lengthPreset: 'medium' });
    const pastHalfIdx = Math.ceil(cards.length / 2);
    expect(estimateRemainingMinutes(cards, pastHalfIdx)).toBe(1);
    expect(estimateRemainingMinutes(cards, cards.length)).toBe(0);
  });
});
