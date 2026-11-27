import { describe, expect, it } from 'vitest';
import { wordRangeAt } from './wordRange';

const T = "Ранок був тихий, і над — їй м'яке світло.";

describe('wordRangeAt', () => {
  it('returns the word at a boundary', () => {
    expect(wordRangeAt(T, 0, 5)).toEqual({ start: 0, end: 5 });
  });

  it('trims trailing punctuation from charLength', () => {
    // «тихий,» → «тихий»
    expect(wordRangeAt(T, 10, 6)).toEqual({ start: 10, end: 15 });
  });

  it('skips a boundary on punctuation', () => {
    expect(wordRangeAt(T, T.indexOf('—'), 1)).toBeNull();
  });

  it('keeps an apostrophe inside a word', () => {
    const i = T.indexOf("м'яке");
    expect(wordRangeAt(T, i, 5)).toEqual({ start: i, end: i + 5 });
  });

  it('finds the word end itself when charLength is 0 or missing', () => {
    expect(wordRangeAt(T, 6)).toEqual({ start: 6, end: 9 });
    expect(wordRangeAt(T, 6, 0)).toEqual({ start: 6, end: 9 });
  });

  it('clamps a charLength that runs past the text', () => {
    const i = T.indexOf('світло');
    expect(wordRangeAt(T, i, 50)).toEqual({ start: i, end: i + 6 });
  });

  it('returns null outside the text', () => {
    expect(wordRangeAt(T, -1, 2)).toBeNull();
    expect(wordRangeAt(T, T.length, 2)).toBeNull();
  });
});
