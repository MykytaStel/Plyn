import { create } from 'zustand';
import type { ThemeMode, UserSettings } from '../core/models/types';
import {
  loadUserSettings,
  saveUserSettings
} from '../services/storage/settingsStorage';

const THEME_META_COLORS: Record<ThemeMode, string> = {
  dark: '#16181D',
  paper: '#F4EFE6',
  gray: '#2C2F33'
};

const THEME_ORDER: ThemeMode[] = ['dark', 'paper', 'gray'];

interface SettingsState extends UserSettings {
  updateSettings: (patch: Partial<UserSettings>) => void;
  cycleTheme: () => void;
  applyToDom: () => void;
}

function syncDom(settings: UserSettings): void {
  document.documentElement.dataset.theme = settings.theme;
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
    const next: UserSettings = {
      theme: patch.theme ?? get().theme,
      fontSize: patch.fontSize ?? get().fontSize,
      lineHeight: patch.lineHeight ?? get().lineHeight,
      anchorMode: patch.anchorMode ?? get().anchorMode,
      cardLength: patch.cardLength ?? get().cardLength
    };
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
    const { theme, fontSize, lineHeight, anchorMode, cardLength } = get();
    syncDom({ theme, fontSize, lineHeight, anchorMode, cardLength });
  }
}));
