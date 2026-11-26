import { describe, expect, it } from 'vitest';
import { splitTextIntoCards } from '../splitter/splitter';
import { formatBookmarksAsMarkdown } from './bookmarksMarkdown';

describe('formatBookmarksAsMarkdown', () => {
  it('exports bookmarked cards with optional notes in clean Markdown', () => {
    const text = 'Перша важлива думка.\n\nДругий абзац для нотатки.';
    const cards = splitTextIntoCards(text, { lengthPreset: 'medium' });

    const md = formatBookmarksAsMarkdown({
      title: 'Конспект',
      cards,
      bookmarkOffsets: [cards[0].startOffset, cards[1].startOffset],
      bookmarkNotes: { [String(cards[1].startOffset)]: 'Повернутися перед зустріччю' }
    });

    expect(md).toContain('# Конспект — Закладки');
    expect(md).toContain('> Перша важлива думка.');
    expect(md).toContain('**Нотатка:** Повернутися перед зустріччю');
  });
});
