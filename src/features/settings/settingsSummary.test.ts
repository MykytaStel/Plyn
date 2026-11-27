import { describe, expect, it } from 'vitest';
import { getI18n } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { settingsSummary } from './settingsSummary';

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
      `${uk.settings.summary.aids.anchor}, ${uk.settings.summary.aids.sentenceFocus}`
    );
  });

  it('aids: syllables are named only while the option is offered', () => {
    const on = { ...base, anchorMode: false, sentenceFocus: false, syllableHints: true };
    expect(settingsSummary('aids', on, ukCtx)).toBe(uk.settings.aidsOff);
    expect(settingsSummary('aids', on, { ...ukCtx, showSyllables: true })).toBe(uk.settings.summary.aids.syllables);
  });

  it('reading: card length, and the timer only in the reader when it runs', () => {
    expect(settingsSummary('reading', { ...base, cardLength: 'medium' }, { ...ukCtx, timerMinutes: 15 })).toBe(
      uk.settings.summary.lengths.medium
    );
    expect(
      settingsSummary('reading', { ...base, cardLength: 'short' }, { ...ukCtx, timerMinutes: 15, isReader: true })
    ).toBe(`${uk.settings.summary.lengths.short}, 15 хв`);
  });

  it('sound: rate and voice in the UI language', () => {
    expect(settingsSummary('sound', { ...base, ttsRate: 1, ttsVoices: {} }, ukCtx)).toBe(
      `1×, ${uk.settings.summary.voiceDefault}`
    );
    expect(settingsSummary('sound', { ...base, ttsRate: 1.25, ttsVoices: { uk: 'lesya' } }, ukCtx)).toBe(
      `1.25×, ${uk.settings.summary.voiceChosen}`
    );
  });

  it('language and library: endonym, then storage use when known', () => {
    expect(settingsSummary('languageLibrary', { ...base, language: 'uk' }, ukCtx)).toBe('Українська');
    expect(settingsSummary('languageLibrary', { ...base, language: 'uk' }, { ...ukCtx, storageLabel: '72 кБ' })).toBe(
      'Українська, 72 кБ'
    );
  });
});
