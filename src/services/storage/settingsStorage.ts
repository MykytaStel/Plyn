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

/** True if this device has saved settings (false after a wipe or on first run). */
export function hasStoredSettings(): boolean {
  try {
    return window.localStorage.getItem(SETTINGS_KEY) !== null;
  } catch {
    return false;
  }
}

const THEMES: readonly UserSettings['theme'][] = ['dark', 'paper', 'gray', 'mint'];
const FONTS: readonly UserSettings['fontFamily'][] = ['sans', 'hyperlegible', 'dyslexic', 'serif'];
const SPACINGS: readonly UserSettings['letterSpacing'][] = ['normal', 'wide', 'extra'];
const WIDTHS: readonly UserSettings['columnWidth'][] = ['narrow', 'standard'];
const TTS_RATES: readonly UserSettings['ttsRate'][] = [0.75, 1, 1.25, 1.5];
const CARD_LENGTHS: readonly UserSettings['cardLength'][] = ['short', 'medium', 'long'];

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Settings from an untrusted source (a backup file): every field is checked,
 * anything unknown or invalid falls back to the default. Null if not an object.
 */
export function parseSettings(raw: unknown): UserSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    theme: oneOf(THEMES, r.theme, d.theme),
    fontFamily: oneOf(FONTS, r.fontFamily, d.fontFamily),
    letterSpacing: oneOf(SPACINGS, r.letterSpacing, d.letterSpacing),
    columnWidth: oneOf(WIDTHS, r.columnWidth, d.columnWidth),
    fontSize: numberIn(r.fontSize, 18, 34, d.fontSize),
    lineHeight: numberIn(r.lineHeight, 1.4, 2.2, d.lineHeight),
    anchorMode: bool(r.anchorMode, d.anchorMode),
    sentenceFocus: bool(r.sentenceFocus, d.sentenceFocus),
    eyeBreakReminder: bool(r.eyeBreakReminder, d.eyeBreakReminder),
    ttsRate: oneOf(TTS_RATES, r.ttsRate, d.ttsRate),
    ttsAutoAdvance: bool(r.ttsAutoAdvance, d.ttsAutoAdvance),
    cardLength: oneOf(CARD_LENGTHS, r.cardLength, d.cardLength),
    language: isLocale(r.language) ? r.language : d.language
  };
}
