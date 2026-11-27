import type { UserSettings } from '../../core/models/types';
import type { I18n } from '../../i18n';
import { LOCALE_NAMES } from '../../i18n/locales';

/** The sections of Settings, in first-screen order (0.27, option B). */
export type SettingsSection = 'appearance' | 'reading' | 'aids' | 'sound' | 'languageLibrary';

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  'appearance',
  'reading',
  'aids',
  'sound',
  'languageLibrary'
];

export interface SummaryContext {
  i18n: I18n;
  timerMinutes: number;
  /** "72 kB", or '' while unknown or unsupported. */
  storageLabel: string;
  isReader: boolean;
  /** Syllable hints are offered (EXP-03); a hidden option is never named. */
  showSyllables: boolean;
}

/**
 * One line of what is set inside a section, comma-joined. It is shown under
 * the row and is part of the row's accessible name.
 */
export function settingsSummary(
  section: SettingsSection,
  s: UserSettings,
  { i18n, timerMinutes, storageLabel, isReader, showSyllables }: SummaryContext
): string {
  const t = i18n.m.settings;
  const parts: string[] = [];
  switch (section) {
    case 'appearance':
      parts.push(t.themes[s.theme], t.summary.fonts[s.fontFamily], `${s.fontSize} px`);
      break;
    case 'reading':
      parts.push(t.summary.lengths[s.cardLength]);
      if (isReader && timerMinutes > 0) {
        parts.push(i18n.format(t.minutesShort, { minutes: timerMinutes }));
      }
      break;
    case 'aids':
      if (s.anchorMode) parts.push(t.summary.aids.anchor);
      if (s.sentenceFocus) parts.push(t.summary.aids.sentenceFocus);
      if (showSyllables && s.syllableHints) parts.push(t.summary.aids.syllables);
      if (parts.length === 0) parts.push(t.aidsOff);
      break;
    case 'sound':
      parts.push(
        `${s.ttsRate}×`,
        s.ttsVoices[i18n.locale] ? t.summary.voiceChosen : t.summary.voiceDefault
      );
      break;
    case 'languageLibrary':
      parts.push(LOCALE_NAMES[s.language]);
      if (storageLabel) parts.push(storageLabel);
      break;
  }
  return parts.join(', ');
}
