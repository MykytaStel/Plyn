import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentChapter } from '../../core/models/types';
import { splitTextIntoCards } from '../../core/splitter/splitter';
import { uk } from '../../i18n/locales/uk';
import { BookmarksSheet, currentChapterIndex } from './BookmarksSheet';

const TEXT = ['Розділ 1', 'Перший абзац.', 'Розділ 2', 'Другий абзац.', 'Розділ 3', 'Третій абзац.'].join('\n\n');
const CHAPTERS: DocumentChapter[] = ['Розділ 1', 'Розділ 2', 'Розділ 3'].map((title) => ({
  title,
  offset: TEXT.indexOf(title),
  level: 0
}));
const cards = splitTextIntoCards(TEXT, { lengthPreset: 'short' });

function renderSheet(props: Partial<Parameters<typeof BookmarksSheet>[0]> = {}) {
  const onSelectCard = vi.fn();
  render(
    <BookmarksSheet
      docTitle="Книга"
      cards={cards}
      bookmarkOffsets={[]}
      bookmarkNotes={{}}
      onSaveNote={() => {}}
      onSelectCard={onSelectCard}
      onClose={() => {}}
      {...props}
    />
  );
  return { onSelectCard };
}

describe('BookmarksSheet with a table of contents', () => {
  it('opens on the contents, marks where you are, and jumps to a chapter', async () => {
    const { onSelectCard } = renderSheet({
      chapters: CHAPTERS,
      currentOffset: CHAPTERS[1].offset + 3
    });

    expect(screen.getByRole('dialog', { name: uk.bookmarks.titleWithContents })).toBeTruthy();
    const list = screen.getByRole('list', { name: uk.bookmarks.contents });
    const items = within(list).getAllByRole('button');
    expect(items).toHaveLength(3);
    expect(items[1].getAttribute('aria-current')).toBe('location');

    await userEvent.click(within(list).getByRole('button', { name: /Розділ 3/ }));
    const target = cards.findIndex((c) => c.startOffset <= CHAPTERS[2].offset && CHAPTERS[2].offset < c.endOffset);
    expect(onSelectCard).toHaveBeenCalledWith(target);
  });

  it('switches to bookmarks', async () => {
    renderSheet({ chapters: CHAPTERS });
    await userEvent.click(screen.getByRole('button', { name: uk.bookmarks.title }));
    expect(screen.queryByRole('list', { name: uk.bookmarks.contents })).toBeNull();
    expect(screen.getByText(uk.bookmarks.empty)).toBeTruthy();
  });

  it('shows plain bookmarks for a text without contents', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: uk.bookmarks.title })).toBeTruthy();
    expect(screen.queryByRole('group', { name: uk.bookmarks.view })).toBeNull();
  });
});

describe('currentChapterIndex', () => {
  it('is the last chapter starting at or before the offset', () => {
    expect(currentChapterIndex(CHAPTERS, 0)).toBe(0);
    expect(currentChapterIndex(CHAPTERS, CHAPTERS[2].offset)).toBe(2);
    expect(currentChapterIndex([{ title: 'Late', offset: 10, level: 0 }], 3)).toBe(-1);
  });
});
