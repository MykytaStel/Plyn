import { describe, expect, it } from 'vitest';
import anchorSpec from '../../spec/anchor-cases.json';
import languageSpec from '../../spec/language-cases.json';
import sentenceSpec from '../../spec/sentence-cases.json';
import { getAnchorLeadLength, tokenizeWithAnchors } from './anchor/anchor';
import {
  contentLanguageToSpeechTag,
  detectContentLanguage,
  type ContentLanguage
} from './language/detectContentLanguage';
import { splitCardIntoSentences } from './splitter/sentences';

/** Shared fixtures in spec/ (also for future native apps). Splitter cases run in splitter.test.ts. */
describe('spec/anchor-cases.json', () => {
  it.each(anchorSpec.leadLengths)('a %i-letter word gets %i bold letters', (length, lead) => {
    expect(getAnchorLeadLength(length)).toBe(lead);
  });

  for (const testCase of anchorSpec.tokenize) {
    it(testCase.name, () => {
      expect(tokenizeWithAnchors(testCase.input)).toEqual(testCase.expected);
    });
  }
});

describe('spec/sentence-cases.json', () => {
  for (const testCase of sentenceSpec.cases) {
    it(testCase.name, () => {
      expect(splitCardIntoSentences(testCase.input)).toEqual(testCase.expected);
    });
  }
});

describe('spec/language-cases.json', () => {
  for (const testCase of languageSpec.cases) {
    it(testCase.name, () => {
      expect(detectContentLanguage(testCase.input)).toBe(testCase.expected);
    });
  }

  it('maps languages to speech tags', () => {
    for (const [lang, tag] of Object.entries(languageSpec.speechTag)) {
      expect(contentLanguageToSpeechTag(lang as ContentLanguage)).toBe(tag);
    }
  });
});
