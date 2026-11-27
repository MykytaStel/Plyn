import { describe, expect, it } from 'vitest';
import { getI18n } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { sentenceCase, settingsSummary } from './settingsSummary';

const ukCtx = { i18n: getI18n('uk'), timerMinutes: 0, storageLabel: '', isReader: false, showSyllables: false };
const base = { ...DEFAULT_SETTINGS };

describe('settingsSummary', () => {
  it('appearance: theme, font and size', () => {
    expect(settingsSummary('appearance', { ...base, theme: 'dark', fontFamily: 'sans', fontSize: 22 }, ukCtx)).toBe(
      'Темна, Fixel, 22 px'
    );
    expect(
      settingsSummary('appearance', { ...base, theme: 'mint', fontFamily: 'serif', fontSize: 28 }, {
        ...ukCtx,
        i18n: getI18n('en')
      })
    ).toBe(`${en.settings.themes.mint}, Literata, 28 px`);
  });

  it('aids: «Вимкнено» when nothing is on, the names of what is on otherwise', () => {
    expect(settingsSummary('aids', { ...base, anchorMode: false, sentenceFocus: false, syllableHints: false }, ukCtx)).toBe(
      uk.settings.aidsOff
    );
    expect(settingsSummary('aids', { ...base, anchorMode: true, sentenceFocus: true }, ukCtx)).toBe(
      sentenceCase(`${uk.settings.summary.aids.anchor}, ${uk.settings.summary.aids.sentenceFocus}`, 'uk')
    );
  });

  it('aids: syllables are named only while the option is offered', () => {
    const on = { ...base, anchorMode: false, sentenceFocus: false, syllableHints: true };
    expect(settingsSummary('aids', on, ukCtx)).toBe(uk.settings.aidsOff);
    expect(settingsSummary('aids', on, { ...ukCtx, showSyllables: true })).toBe(
      sentenceCase(uk.settings.summary.aids.syllables, 'uk')
    );
  });

  it('reading: card length, and the timer only in the reader when it runs', () => {
    expect(settingsSummary('reading', { ...base, cardLength: 'medium' }, { ...ukCtx, timerMinutes: 15 })).toBe(
      uk.settings.summary.lengths.medium
    );
    expect(
      settingsSummary('reading', { ...base, cardLength: 'short' }, { ...ukCtx, timerMinutes: 15, isReader: true })
    ).toBe(`${uk.settings.summary.lengths.short}, 15 хв`);
  });

  it('sound: rate and “browser voice” when no voice is chosen', () => {
    expect(settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: {} }, ukCtx)).toBe(
      `1×, ${uk.settings.summary.voiceDefault}`
    );
  });

  it('sound: the chosen voice by name, the UI language’s first, else the other', () => {
    const voiceName = (uri: string) => ({ lesya: 'Lesya', daniel: 'Daniel' })[uri];
    const ctx = { ...ukCtx, voiceName };
    expect(settingsSummary('sound', { ...base, ttsRate: 1.25, ttsVoices: { uk: 'lesya', en: 'daniel' } }, ctx)).toBe(
      '1.25×, Lesya'
    );
    expect(settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: { en: 'daniel' } }, ctx)).toBe('1×, Daniel');
    expect(
      settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: { uk: 'lesya', en: 'daniel' } }, {
        ...ctx,
        i18n: getI18n('en')
      })
    ).toBe('1×, Daniel');
  });

  it('sound: a chosen voice missing on this device is “your voice”', () => {
    expect(settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: { en: 'gone' } }, ukCtx)).toBe(
      `1×, ${uk.settings.summary.voiceChosen}`
    );
  });

  it('English: sentence case for the first item only', () => {
    const enCtx = { ...ukCtx, i18n: getI18n('en') };
    expect(settingsSummary('reading', { ...base, cardLength: 'medium' }, enCtx)).toBe('Medium cards');
    expect(settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: {} }, enCtx)).toBe('1×, browser voice');
    expect(
      settingsSummary('aids', { ...base, anchorMode: true, sentenceFocus: true, syllableHints: true }, {
        ...enCtx,
        showSyllables: true
      })
    ).toBe('Anchor, sentence focus, syllables');
  });

  it('language and library: endonym, then storage use when known', () => {
    expect(settingsSummary('languageLibrary', { ...base, language: 'uk' }, ukCtx)).toBe('Українська');
    expect(settingsSummary('languageLibrary', { ...base, language: 'uk' }, { ...ukCtx, storageLabel: '72 кБ' })).toBe(
      'Українська, 72 кБ'
    );
  });
});
