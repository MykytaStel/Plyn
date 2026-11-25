import { describe, expect, it } from 'vitest';
import { getAnchorLeadLength, tokenizeWithAnchors } from './anchor';

describe('tokenizeWithAnchors', () => {
  it('handles Ukrainian words, apostrophes, and punctuation cleanly', () => {
    const tokens = tokenizeWithAnchors('Об’єкт і світ!');
    expect(tokens).toEqual([
      { type: 'word', lead: 'Об’', rest: 'єкт' },
      { type: 'text', value: ' ' },
      { type: 'text', value: 'і' },
      { type: 'text', value: ' ' },
      { type: 'word', lead: 'св', rest: 'іт' },
      { type: 'text', value: '!' }
    ]);
  });

  it('calculates proportional anchor lengths', () => {
    expect(getAnchorLeadLength(1)).toBe(0);
    expect(getAnchorLeadLength(3)).toBe(1);
    expect(getAnchorLeadLength(5)).toBe(2);
    expect(getAnchorLeadLength(7)).toBe(3);
    expect(getAnchorLeadLength(10)).toBe(4);
  });
});
