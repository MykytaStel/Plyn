import { describe, expect, it } from 'vitest';
import { chapterStartingIn } from './chapterBoundary';

const ch = (offset: number, title = `c${offset}`) => ({ title, offset, level: 0 });

describe('chapterStartingIn', () => {
  it('finds a chapter starting at the card start', () => {
    expect(chapterStartingIn([ch(0), ch(100)], { startOffset: 100, endOffset: 180 })?.offset).toBe(100);
  });

  it('finds a chapter starting inside the card', () => {
    expect(chapterStartingIn([ch(140)], { startOffset: 100, endOffset: 180 })?.offset).toBe(140);
  });

  it('ignores a chapter at the card end (it belongs to the next card)', () => {
    expect(chapterStartingIn([ch(180)], { startOffset: 100, endOffset: 180 })).toBeNull();
  });

  it('returns null without chapters', () => {
    expect(chapterStartingIn(undefined, { startOffset: 0, endOffset: 50 })).toBeNull();
    expect(chapterStartingIn([], { startOffset: 0, endOffset: 50 })).toBeNull();
  });

  it('returns the first of several chapters in one card', () => {
    expect(
      chapterStartingIn([ch(130, 'b'), ch(120, 'a')], { startOffset: 100, endOffset: 180 })?.title
    ).toBe('a');
  });
});
