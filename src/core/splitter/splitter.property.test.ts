import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CardLengthPreset } from '../models/types';
import { findCardIndexByOffset, normalizeText, splitTextIntoCards } from './splitter';

/** Fixed seed in CI so failures reproduce; fast-check prints the seed and path on failure. */
const RUNS = { seed: 19_0_0, numRuns: 300 };

const PRESETS: CardLengthPreset[] = ['short', 'medium', 'long'];
const preset = fc.constantFrom(...PRESETS);

/** Text that looks like prose: words, spaces, punctuation, line breaks, Cyrillic and Latin. */
const pieces = fc.constantFrom(
  'слово', 'Привіт', 'їжак', 'ґанок', 'word', 'Reader', 'a', 'м.', 'т.д.', 'e.g.',
  ' ', ' ', ' ', ', ', '; ', ' — ', '. ', '! ', '? ', '… ', '.', '»', '"', '\n', '\n\n', '\t',
  'дуже-довге-слово-без-пробілів-яке-не-можна-розірвати'
);
const prose = fc.array(pieces, { maxLength: 200 }).map((parts) => parts.join(''));
const anyText = fc.oneof(prose, fc.string({ maxLength: 400 }));

describe('splitTextIntoCards properties', () => {
  it('offsets stay inside the normalized text and never go back', () => {
    fc.assert(
      fc.property(anyText, preset, (text, lengthPreset) => {
        const normalized = normalizeText(text);
        const cards = splitTextIntoCards(text, { lengthPreset });
        let previousEnd = 0;
        cards.forEach((card, i) => {
          expect(card.index).toBe(i);
          expect(card.startOffset).toBeGreaterThanOrEqual(previousEnd);
          expect(card.endOffset).toBeGreaterThan(card.startOffset);
          expect(card.endOffset).toBeLessThanOrEqual(normalized.length);
          previousEnd = card.endOffset;
        });
      }),
      RUNS
    );
  });

  it('each card is the exact slice of the normalized text at its offsets', () => {
    fc.assert(
      fc.property(prose, preset, (text, lengthPreset) => {
        const normalized = normalizeText(text);
        for (const card of splitTextIntoCards(text, { lengthPreset })) {
          expect(normalized.slice(card.startOffset, card.endOffset)).toBe(card.text);
        }
      }),
      RUNS
    );
  });

  it('every non-whitespace character belongs to exactly one card', () => {
    fc.assert(
      fc.property(prose, preset, (text, lengthPreset) => {
        const normalized = normalizeText(text);
        const owners = new Array<number>(normalized.length).fill(0);
        for (const card of splitTextIntoCards(text, { lengthPreset })) {
          for (let i = card.startOffset; i < card.endOffset; i += 1) owners[i] += 1;
        }
        for (let i = 0; i < normalized.length; i += 1) {
          if (/\S/.test(normalized[i])) expect(owners[i]).toBe(1);
        }
      }),
      RUNS
    );
  });

  it('a card’s start offset maps back to that card', () => {
    fc.assert(
      fc.property(anyText, preset, (text, lengthPreset) => {
        const cards = splitTextIntoCards(text, { lengthPreset });
        cards.forEach((card, i) => {
          expect(findCardIndexByOffset(cards, card.startOffset)).toBe(i);
        });
      }),
      RUNS
    );
  });

  it('switching card length and back keeps the reading position', () => {
    fc.assert(
      fc.property(prose, preset, preset, fc.nat(), (text, from, to, pick) => {
        const before = splitTextIntoCards(text, { lengthPreset: from });
        if (before.length === 0) return;
        const card = before[pick % before.length];

        const other = splitTextIntoCards(text, { lengthPreset: to });
        const otherCard = other[findCardIndexByOffset(other, card.startOffset)];
        expect(otherCard.startOffset).toBeLessThanOrEqual(card.startOffset);
        expect(otherCard.endOffset).toBeGreaterThan(card.startOffset);

        const back = before[findCardIndexByOffset(before, otherCard.startOffset)];
        expect(back.startOffset).toBeLessThanOrEqual(card.startOffset);
      }),
      RUNS
    );
  });
});
