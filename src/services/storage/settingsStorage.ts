import type { UserSettings } from '../../core/models/types';

const SETTINGS_KEY = 'plyn_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  fontFamily: 'sans',
  fontSize: 24,
  lineHeight: 1.65,
  anchorMode: false,
  cardLength: 'medium'
};

export function loadUserSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ігноруємо помилки квоти або приватного режиму Safari
  }
}
