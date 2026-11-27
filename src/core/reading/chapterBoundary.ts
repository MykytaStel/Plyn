import type { DocumentChapter, ReadingCard } from '../models/types';

/**
 * The chapter that starts inside a card (startOffset <= offset < endOffset),
 * the earliest one if several do. Listening stops before such a card (0.26).
 */
export function chapterStartingIn(
  chapters: readonly DocumentChapter[] | undefined,
  card: Pick<ReadingCard, 'startOffset' | 'endOffset'>
): DocumentChapter | null {
  let found: DocumentChapter | null = null;
  for (const chapter of chapters ?? []) {
    if (chapter.offset < card.startOffset || chapter.offset >= card.endOffset) continue;
    if (!found || chapter.offset < found.offset) found = chapter;
  }
  return found;
}
