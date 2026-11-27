import { describe, expect, it } from 'vitest';
import { normalizeText, splitTextIntoCards } from './splitter';

/** About a 600-page book: 1 M characters in 3,000 paragraphs. */
function millionCharacterText(): string {
  const sentence = 'Речення про спокійне читання короткими картками, без поспіху. ';
  const paragraphs: string[] = [];
  let length = 0;
  for (let i = 0; length < 1_000_000; i += 1) {
    const p = `${i}. ${sentence.repeat(5).trim()}`;
    paragraphs.push(p);
    length += p.length + 1;
  }
  return paragraphs.join('\n');
}

describe('splitter on a 1 M-character text (0.25 benchmark)', () => {
  const text = millionCharacterText();

  it('covers the whole text with exact slices, in order', () => {
    const cards = splitTextIntoCards(text, { lengthPreset: 'medium' });
    const normalized = normalizeText(text);
    expect(cards.length).toBeGreaterThan(3000);
    let previousEnd = 0;
    for (const card of cards) {
      expect(card.startOffset).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = card.endOffset;
    }
    expect(cards.at(-1)!.endOffset).toBe(normalized.length);
    expect(cards[123].text).toBe(normalized.slice(cards[123].startOffset, cards[123].endOffset));
  });

  it('stays within a generous time budget', () => {
    // ~15 ms in a desktop browser; the budget allows for slow CI machines and
    // catches an accidental quadratic slowdown, which would take seconds.
    const started = performance.now();
    splitTextIntoCards(text, { lengthPreset: 'short' });
    expect(performance.now() - started).toBeLessThan(1500);
  });
});
