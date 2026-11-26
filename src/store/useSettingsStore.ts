import { create } from 'zustand';
import type { ThemeMode, UserSettings } from '../core/models/types';
import {
  loadUserSettings,
  mergeSettings,
  saveUserSettings
} from '../services/storage/settingsStorage';

const THEME_META_COLORS: Record<ThemeMode, string> = {
  dark: '#16181D',
  paper: '#F4EFE6',
  gray: '#2C2F33',
  mint: '#E6EFEA'
};

const THEME_ORDER: ThemeMode[] = ['dark', 'paper', 'gray', 'mint'];

interface SettingsState extends UserSettings {
  updateSettings: (patch: Partial<UserSettings>) => void;
  cycleTheme: () => void;
  applyToDom: () => void;
}

/** Strips store actions, leaving only persisted settings. */
function pickSettings(state: UserSettings): UserSettings {
  return mergeSettings(state, {});
}

function syncDom(settings: UserSettings): void {
  document.documentElement.lang = settings.language;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.font = settings.fontFamily;
  document.documentElement.dataset.spacing = settings.letterSpacing;
  document.documentElement.dataset.width = settings.columnWidth;
  document.documentElement.style.setProperty(
    '--reader-font-size',
    `${settings.fontSize}px`
  );
  document.documentElement.style.setProperty(
    '--reader-line-height',
    String(settings.lineHeight)
  );
  const meta = document.getElementById('meta-theme-color');
  if (meta) {
    meta.setAttribute('content', THEME_META_COLORS[settings.theme]);
  }
}

const initial = loadUserSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  updateSettings: (patch) => {
    const next = mergeSettings(pickSettings(get()), patch);
    saveUserSettings(next);
    syncDom(next);
    set(next);
  },
  cycleTheme: () => {
    const current = get().theme;
    const nextTheme =
      THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    get().updateSettings({ theme: nextTheme });
  },
  applyToDom: () => {
    syncDom(pickSettings(get()));
  }
}));
