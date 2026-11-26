import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { tokenizeWithAnchors } from './anchor/anchor';
import { detectContentLanguage } from './language/detectContentLanguage';
import { splitCardIntoSentences } from './splitter/sentences';

const RUNS = { seed: 1900, numRuns: 300 };

const text = fc.oneof(
  fc.string({ maxLength: 300 }),
  fc
    .array(fc.constantFrom('Об’єкт', 'ґанок', 'word', ' ', '!', '?', '…', '. ', 'м.', '«', '»', '\n', '3'), {
      maxLength: 80
    })
    .map((parts) => parts.join(''))
);

describe('core properties', () => {
  it('anchor tokens joined give back the original text', () => {
    fc.assert(
      fc.property(text, (input) => {
        const joined = tokenizeWithAnchors(input)
          .map((t) => (t.type === 'word' ? t.lead + t.rest : t.value))
          .join('');
        expect(joined).toBe(input);
      }),
      RUNS
    );
  });

  it('sentence focus loses no non-whitespace character', () => {
    fc.assert(
      fc.property(text, (input) => {
        const strip = (s: string) => s.replace(/\s+/g, '');
        expect(splitCardIntoSentences(input).map(strip).join('')).toBe(strip(input));
      }),
      RUNS
    );
  });

  it('language detection never throws and returns a known id', () => {
    fc.assert(
      fc.property(text, (input) => {
        expect(['uk', 'en']).toContain(detectContentLanguage(input));
      }),
      RUNS
    );
  });
});
