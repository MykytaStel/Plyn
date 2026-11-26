import type { UserSettings } from '../models/types';

export interface ReadingPreset {
  id: 'dyslexia' | 'tired_eyes' | 'book';
  label: string;
  hint: string;
  patch: Partial<UserSettings>;
}

/**
 * Готові пресети в 1 тап, щоб не крутити 10 налаштувань вручну.
 */
export const READING_PRESETS: ReadingPreset[] = [
  {
    id: 'dyslexia',
    label: 'Дислексія',
    hint: 'OpenDyslexic · ширший інтервал · М’ята · Фокус-речення',
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
    label: 'Втомлені очі',
    hint: 'Atkinson Hyperlegible · Темна · Якір · 20-20-20',
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
    label: 'Книга',
    hint: 'Literata · Паперова · спокійний інтервал',
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
