import type { UserSettings } from '../../core/models/types';
import { isLocale } from '../../i18n/locales';

const SETTINGS_KEY = 'plyn_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  fontFamily: 'sans',
  letterSpacing: 'normal',
  columnWidth: 'standard',
  fontSize: 24,
  lineHeight: 1.65,
  anchorMode: false,
  sentenceFocus: false,
  eyeBreakReminder: false,
  ttsRate: 1,
  ttsAutoAdvance: false,
  cardLength: 'medium',
  language: 'uk'
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!isLocale(merged.language)) merged.language = DEFAULT_SETTINGS.language;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Applies a partial patch on top of the previous settings. Explicit per-field
 * merge so that unknown keys never leak into storage.
 */
export function mergeSettings(
  prev: UserSettings,
  patch: Partial<UserSettings>
): UserSettings {
  return {
    theme: patch.theme ?? prev.theme,
    fontFamily: patch.fontFamily ?? prev.fontFamily,
    letterSpacing: patch.letterSpacing ?? prev.letterSpacing,
    columnWidth: patch.columnWidth ?? prev.columnWidth,
    fontSize: patch.fontSize ?? prev.fontSize,
    lineHeight: patch.lineHeight ?? prev.lineHeight,
    anchorMode: patch.anchorMode ?? prev.anchorMode,
    sentenceFocus: patch.sentenceFocus ?? prev.sentenceFocus,
    eyeBreakReminder: patch.eyeBreakReminder ?? prev.eyeBreakReminder,
    ttsRate: patch.ttsRate ?? prev.ttsRate,
    ttsAutoAdvance: patch.ttsAutoAdvance ?? prev.ttsAutoAdvance,
    cardLength: patch.cardLength ?? prev.cardLength,
    language: patch.language ?? prev.language
  };
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ігноруємо помилки квоти або приватного режиму Safari
  }
}
