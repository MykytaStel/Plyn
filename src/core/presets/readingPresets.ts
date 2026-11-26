import type { UserSettings } from '../models/types';

/** Copy (label, hint) lives in src/i18n: m.presets[id]. */
export interface ReadingPreset {
  id: 'dyslexia' | 'tired_eyes' | 'book';
  patch: Partial<UserSettings>;
}

/**
 * Готові пресети в 1 тап, щоб не крутити 10 налаштувань вручну.
 */
export const READING_PRESETS: ReadingPreset[] = [
  {
    id: 'dyslexia',
    patch: {
      theme: 'mint',
      fontFamily: 'dyslexic',
      letterSpacing: 'extra',
      columnWidth: 'narrow',
      sentenceFocus: true,
      anchorMode: false,
      lineHeight: 1.85
    }
  },
  {
    id: 'tired_eyes',
    patch: {
      theme: 'dark',
      fontFamily: 'hyperlegible',
      letterSpacing: 'wide',
      columnWidth: 'narrow',
      anchorMode: true,
      sentenceFocus: false,
      eyeBreakReminder: true,
      lineHeight: 1.75
    }
  },
  {
    id: 'book',
    patch: {
      theme: 'paper',
      fontFamily: 'serif',
      letterSpacing: 'normal',
      columnWidth: 'standard',
      anchorMode: false,
      sentenceFocus: false,
      lineHeight: 1.65
    }
  }
];
