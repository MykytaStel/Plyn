import { describe, expect, it } from 'vitest';
import spec from '../../../spec/splitter-cases.json';
import {
  findCardIndexByOffset,
  splitTextIntoCards
} from './splitter';
import type { CardLengthPreset } from '../models/types';

describe('splitTextIntoCards (shared spec fixtures)', () => {
  for (const testCase of spec.cases) {
    it(testCase.name, () => {
      const cards = splitTextIntoCards(testCase.input, {
        lengthPreset: testCase.lengthPreset as CardLengthPreset
      });

      if (testCase.expected) {
        expect(cards.map((c) => c.text)).toEqual(testCase.expected);
      }

      if (testCase.maxCardLength) {
        expect(cards.length).toBeGreaterThan(1);
        for (const card of cards) {
          expect(card.text.length).toBeLessThanOrEqual(testCase.maxCardLength);
        }
      }
    });
  }

  it('preserves exact reading position via charOffset across card length presets', () => {
    const text =
      'Перше речення для тесту. Друге речення додає контекст. Третє речення дуже важливе для перевірки позиції. Четверте речення завершує думку.';
    const shortCards = splitTextIntoCards(text, { lengthPreset: 'short' });
    const longCards = splitTextIntoCards(text, { lengthPreset: 'long' });

    const targetCard = shortCards[shortCards.length - 1];
    const mappedIdx = findCardIndexByOffset(longCards, targetCard.startOffset);

    expect(longCards[mappedIdx].text).toContain('Четверте речення');
  });

  it('never breaks a single overly long word', () => {
    const longWord = 'а'.repeat(160);
    const cards = splitTextIntoCards(longWord, { lengthPreset: 'short' });
    expect(cards).toHaveLength(1);
    expect(cards[0].text).toBe(longWord);
  });
});
