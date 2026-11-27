import { describe, expect, it } from 'vitest';
import { effectiveWordsPerMinute, updatePace } from './pace';

describe('updatePace', () => {
  it('ignores empty cards', () => {
    expect(updatePace(undefined, { words: 0, ms: 9000 })).toBeUndefined();
  });
  it('ignores too short dwell', () => {
    expect(updatePace(undefined, { words: 30, ms: 1000 })).toBeUndefined();
  });
  it('takes the first sample as is', () => {
    expect(updatePace(undefined, { words: 30, ms: 10_000 })).toEqual({
      wordsPerMinute: 180,
      samples: 1,
    });
  });
  it('caps a paused card at 3x the expected time', () => {
    const next = updatePace(
      { wordsPerMinute: 180, samples: 25 },
      { words: 30, ms: 600_000 }
    );
    expect(next?.wordsPerMinute).toBeCloseTo(162, 6);
    expect(next?.samples).toBe(26);
  });
  it('clamps very fast reading', () => {
    expect(updatePace(undefined, { words: 300, ms: 6000 })?.wordsPerMinute).toBe(600);
  });
  it('clamps very slow reading', () => {
    expect(updatePace(undefined, { words: 10, ms: 59_000 })?.wordsPerMinute).toBe(60);
  });
});

describe('effectiveWordsPerMinute', () => {
  it('falls back to the calm pace', () => {
    expect(effectiveWordsPerMinute(undefined)).toBe(180);
    expect(effectiveWordsPerMinute({ wordsPerMinute: 240, samples: 19 })).toBe(180);
  });
  it('uses the learned pace after enough samples', () => {
    expect(effectiveWordsPerMinute({ wordsPerMinute: 240, samples: 20 })).toBe(240);
  });
  it('clamps an out-of-range stored pace', () => {
    expect(effectiveWordsPerMinute({ wordsPerMinute: 5000, samples: 50 })).toBe(600);
    expect(effectiveWordsPerMinute({ wordsPerMinute: 5, samples: 50 })).toBe(60);
  });
});
