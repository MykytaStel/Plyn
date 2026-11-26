import type { ReadingCard } from '../models/types';
import { findCardIndexByOffset } from '../splitter/splitter';

/**
 * Формує чистий Markdown-файл із закладками та нотатками користувача для поточного тексту.
 */
export function formatBookmarksAsMarkdown(input: {
  title: string;
  cards: ReadingCard[];
  bookmarkOffsets: number[];
  bookmarkNotes?: Record<string, string>;
  /** Localized headings; `card` contains `{n}`. */
  labels: { bookmarks: string; card: string; note: string };
}): string {
  const { title, cards, bookmarkOffsets, bookmarkNotes = {}, labels } = input;
  const seenCards = new Set<number>();
  const lines: string[] = [`# ${title} — ${labels.bookmarks}`, ''];

  const sortedOffsets = [...bookmarkOffsets].sort((a, b) => a - b);

  for (const offset of sortedOffsets) {
    const idx = findCardIndexByOffset(cards, offset);
    if (seenCards.has(idx)) continue;
    seenCards.add(idx);

    const card = cards[idx];
    if (!card) continue;

    lines.push(`### ${labels.card.replace('{n}', String(idx + 1))}`);
    lines.push(`> ${card.text}`);

    const note = (bookmarkNotes[String(offset)] || '').trim();
    if (note) {
      lines.push('');
      lines.push(`**${labels.note}:** ${note}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}
