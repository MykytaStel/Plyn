import { describe, expect, it } from 'vitest';
import { splitCardIntoSentences } from './sentences';

describe('splitCardIntoSentences', () => {
  it('splits card text into individual sentences while preserving abbreviations', () => {
    const sentences = splitCardIntoSentences(
      'Зустріч у м. Київ пройшла чудово. Наступного разу поїдемо далі!'
    );
    expect(sentences).toEqual([
      'Зустріч у м. Київ пройшла чудово.',
      'Наступного разу поїдемо далі!'
    ]);
  });

  it('returns empty array for empty text', () => {
    expect(splitCardIntoSentences('   ')).toEqual([]);
  });
});
