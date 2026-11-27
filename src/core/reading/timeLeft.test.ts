import { describe, expect, it } from 'vitest';
import type { DocumentChapter, ReadingCard } from '../models/types';
import {
  chapterEndFromStarts,
  chapterEndIndex,
  chapterStartIndices,
  cumulativeWords,
  minutesForWordsAt,
  toTimeLeft,
} from './timeLeft';

function mk(texts: string[]): ReadingCard[] {
  let pos = 0;
  return texts.map((text, index) => {
    const card = { index, text, startOffset: pos, endOffset: pos + text.length };
    pos += text.length + 1;
    return card;
  });
}
const ch = (offset: number): DocumentChapter => ({ title: 'c', offset, level: 0 });

describe('cumulativeWords', () => {
  it('sums words per card', () => {
    expect(cumulativeWords(mk(['one two', 'a b c', '']))).toEqual([0, 2, 5, 5]);
  });
});

describe('chapterEndIndex', () => {
  const cards = mk(['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee']);
  it('is the end of the text without chapters', () => {
    expect(chapterEndIndex(cards, [], 1)).toBe(5);
  });
  it('points at the next chapter card', () => {
    const chapters = [ch(0), ch(cards[2].startOffset), ch(cards[4].startOffset)];
    expect(chapterEndIndex(cards, chapters, 2)).toBe(4);
    expect(chapterEndIndex(cards, chapters, 3)).toBe(4);
  });
  it('is the end of the text in the last chapter', () => {
    expect(chapterEndIndex(cards, [ch(0), ch(cards[2].startOffset)], 3)).toBe(5);
  });
  it('points at the first chapter before it starts', () => {
    expect(chapterEndIndex(cards, [ch(cards[2].startOffset)], 0)).toBe(2);
  });
  it('never returns an index at or before the current card', () => {
    const chapters = [ch(cards[1].startOffset), ch(cards[1].startOffset + 1), ch(cards[2].startOffset)];
    expect(chapterEndIndex(cards, chapters, 1)).toBe(2);
    expect(chapterEndIndex(cards, chapters.slice(0, 2), 1)).toBe(5);
  });
});

describe('minutesForWordsAt', () => {
  it('rounds up and is zero for no words', () => {
    expect(minutesForWordsAt(0, 180)).toBe(0);
    expect(minutesForWordsAt(1, 180)).toBe(1);
    expect(minutesForWordsAt(361, 180)).toBe(3);
  });
});

describe('toTimeLeft', () => {
  it('maps minutes to a unit', () => {
    expect(toTimeLeft(0)).toBeNull();
    expect(toTimeLeft(60)).toEqual({ unit: 'min', value: 60 });
    expect(toTimeLeft(61)).toEqual({ unit: 'hour', value: 1 });
    expect(toTimeLeft(89)).toEqual({ unit: 'hour', value: 1 });
    expect(toTimeLeft(150)).toEqual({ unit: 'hour', value: 3 });
  });
});

describe('chapterStartIndices / chapterEndFromStarts', () => {
  const cards = mk(['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee']);
  it('gives sorted unique starts and matches chapterEndIndex', () => {
    const chapters = [ch(cards[4].startOffset), ch(cards[2].startOffset), ch(cards[2].startOffset + 1)];
    const starts = chapterStartIndices(cards, chapters);
    expect(starts).toEqual([2, 4]);
    for (let i = 0; i < cards.length; i += 1) {
      expect(chapterEndFromStarts(starts, cards.length, i)).toBe(chapterEndIndex(cards, chapters, i));
    }
  });
});
