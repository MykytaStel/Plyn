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
}): string {
  const { title, cards, bookmarkOffsets, bookmarkNotes = {} } = input;
  const seenCards = new Set<number>();
  const lines: string[] = [`# ${title} — Закладки`, ''];

  const sortedOffsets = [...bookmarkOffsets].sort((a, b) => a - b);

  for (const offset of sortedOffsets) {
    const idx = findCardIndexByOffset(cards, offset);
    if (seenCards.has(idx)) continue;
    seenCards.add(idx);

    const card = cards[idx];
    if (!card) continue;

    lines.push(`### Картка ${idx + 1}`);
    lines.push(`> ${card.text}`);

    const note = (bookmarkNotes[String(offset)] || '').trim();
    if (note) {
      lines.push('');
      lines.push(`**Нотатка:** ${note}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}
