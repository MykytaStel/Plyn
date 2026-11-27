import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { FEED_WINDOW_RADIUS, feedWindow, isOutsideFeedWindow } from './feedWindow';

describe('feedWindow', () => {
  it('keeps a few cards around the current one in a long book', () => {
    expect(feedWindow(5000, 10000)).toEqual({ start: 4995, end: 5005 });
  });

  it('is clamped at both ends', () => {
    expect(feedWindow(0, 10000)).toEqual({ start: 0, end: 5 });
    expect(feedWindow(9999, 10000)).toEqual({ start: 9994, end: 9999 });
    expect(feedWindow(2, 3)).toEqual({ start: 0, end: 2 });
  });

  it('clamps an index past the end to the last card', () => {
    expect(feedWindow(50, 10)).toEqual({ start: 4, end: 9 });
  });

  it('is empty for an empty text', () => {
    const w = feedWindow(0, 0);
    expect(w.end).toBeLessThan(w.start);
  });

  it('always holds the current card and never more than 2r + 1 cards', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50000 }), fc.nat(), (total, raw) => {
        const current = raw % total;
        const { start, end } = feedWindow(current, total);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(total - 1);
        expect(start).toBeLessThanOrEqual(current);
        expect(end).toBeGreaterThanOrEqual(current);
        expect(end - start + 1).toBeLessThanOrEqual(2 * FEED_WINDOW_RADIUS + 1);
      }),
      { seed: 25 }
    );
  });
});

describe('isOutsideFeedWindow', () => {
  it('is false for neighbours and true for far jumps', () => {
    expect(isOutsideFeedWindow(101, 100)).toBe(false);
    expect(isOutsideFeedWindow(100 + FEED_WINDOW_RADIUS, 100)).toBe(false);
    expect(isOutsideFeedWindow(100 + FEED_WINDOW_RADIUS + 1, 100)).toBe(true);
    expect(isOutsideFeedWindow(0, 5000)).toBe(true);
  });
});
