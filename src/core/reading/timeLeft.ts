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

/** Sorted, de-duplicated card indices where chapters start (compute once per document). */
export function chapterStartIndices(cards: ReadingCard[], chapters: DocumentChapter[]): number[] {
  const starts = chapters.map((c) => findCardIndexByOffset(cards, c.offset));
  return [...new Set(starts)].sort((a, b) => a - b);
}

/** Exclusive end of the chapter holding currentIndex, from precomputed starts. */
export function chapterEndFromStarts(
  starts: number[],
  total: number,
  currentIndex: number
): number {
  let lo = 0;
  let hi = starts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] > currentIndex) hi = mid;
    else lo = mid + 1;
  }
  return lo < starts.length ? Math.min(starts[lo], total) : total;
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
  return chapterEndFromStarts(chapterStartIndices(cards, chapters), cards.length, currentIndex);
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
