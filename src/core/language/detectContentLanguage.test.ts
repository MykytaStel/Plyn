import { describe, expect, it } from 'vitest';
import {
  contentLanguageToSpeechTag,
  detectContentLanguage
} from './detectContentLanguage';

describe('detectContentLanguage', () => {
  it('detects Ukrainian', () => {
    expect(detectContentLanguage('Привіт, світ')).toBe('uk');
  });
  it('detects English', () => {
    expect(detectContentLanguage('Hello world')).toBe('en');
  });
  it('prefers Ukrainian for mixed text with more Cyrillic', () => {
    expect(detectContentLanguage('Plyn — це читалка')).toBe('uk');
  });
  it('defaults to Ukrainian for empty text', () => {
    expect(detectContentLanguage('')).toBe('uk');
  });
});

describe('contentLanguageToSpeechTag', () => {
  it('maps to BCP-47 voice tags', () => {
    expect(contentLanguageToSpeechTag('en')).toBe('en-US');
    expect(contentLanguageToSpeechTag('uk')).toBe('uk-UA');
  });
});
