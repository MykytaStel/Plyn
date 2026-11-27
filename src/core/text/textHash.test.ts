import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { textHash } from './textHash';

describe('textHash', () => {
  it('is stable for the same text', () => {
    expect(textHash('Тиха книжка.')).toBe(textHash('Тиха книжка.'));
  });

  it('is pinned, so stored hashes stay valid across releases', () => {
    // Changing the function would orphan every stored `textHash`.
    expect(textHash('')).toBe('wvjl67o803:0');
    expect(textHash('Привіт, світе.')).toBe('102rnnwf70f:e');
  });

  it('differs for texts that differ in one character or in length', () => {
    expect(textHash('Речення 1.')).not.toBe(textHash('Речення 2.'));
    expect(textHash('abc')).not.toBe(textHash('abc '));
  });

  it('almost never collides on random texts', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        if (a !== b) expect(textHash(a)).not.toBe(textHash(b));
      }),
      { seed: 25, numRuns: 500 }
    );
  });
});
