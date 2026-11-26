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
      bookmarkNotes: { [String(cards[1].startOffset)]: 'Повернутися перед зустріччю' },
      labels: { bookmarks: 'Закладки', card: 'Картка {n}', note: 'Нотатка' }
    });

    expect(md).toContain('# Конспект — Закладки');
    expect(md).toContain('> Перша важлива думка.');
    expect(md).toContain('**Нотатка:** Повернутися перед зустріччю');
  });

  it('uses the given labels for headings', () => {
    const cards = splitTextIntoCards('First idea.\n\nSecond idea.', { lengthPreset: 'medium' });
    const md = formatBookmarksAsMarkdown({
      title: 'Notes',
      cards,
      bookmarkOffsets: [cards[1].startOffset],
      bookmarkNotes: { [String(cards[1].startOffset)]: 'Check later' },
      labels: { bookmarks: 'Bookmarks', card: 'Card {n}', note: 'Note' }
    });
    expect(md).toContain('# Notes — Bookmarks');
    expect(md).toContain('### Card 2');
    expect(md).toContain('**Note:** Check later');
  });
});
