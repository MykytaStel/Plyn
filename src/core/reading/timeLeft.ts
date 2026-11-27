import type { DocumentChapter, ReadingCard } from '../models/types';
import { findCardIndexByOffset } from '../splitter/splitter';
import { countWords } from './readingStats';

/** Prefix sums of word counts: length cards.length + 1, [0] = 0. */
export function cumulativeWords(cards: ReadingCard[]): number[] {
  const out = new Array<number>(cards.length + 1);
  out[0] = 0;
  for (let i = 0; i < cards.length; i += 1) {
    out[i + 1] = out[i] + countWords(cards[i].text);
  }
  return out;
}

/**
 * Exclusive card index where the current chapter ends: the first chapter start
 * that lands on a card after the current one, or cards.length.
 */
export function chapterEndIndex(
  cards: ReadingCard[],
  chapters: DocumentChapter[],
  currentIndex: number
): number {
  let end = cards.length;
  for (const chapter of chapters) {
    const idx = findCardIndexByOffset(cards, chapter.offset);
    if (idx > currentIndex && idx < end) end = idx;
  }
  return end;
}

export function minutesForWordsAt(words: number, wpm: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / wpm));
}

export type TimeLeft = { unit: 'min' | 'hour'; value: number } | null;

export function toTimeLeft(minutes: number): TimeLeft {
  if (minutes <= 0) return null;
  if (minutes <= 60) return { unit: 'min', value: minutes };
  return { unit: 'hour', value: Math.max(1, Math.round(minutes / 60)) };
}
