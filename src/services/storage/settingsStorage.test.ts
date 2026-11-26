import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadUserSettings,
  mergeSettings,
  saveUserSettings
} from './settingsStorage';

const KEY = 'plyn_settings_v1';

function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  };
  return store;
}

describe('settings language', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installLocalStorage();
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('defaults to uk', () => {
    expect(DEFAULT_SETTINGS.language).toBe('uk');
    expect(loadUserSettings().language).toBe('uk');
  });

  it('loads v0.16 settings without language as uk', () => {
    store.set(KEY, JSON.stringify({ theme: 'paper' }));
    const s = loadUserSettings();
    expect(s.language).toBe('uk');
    expect(s.theme).toBe('paper');
  });

  it('coerces an invalid language to uk', () => {
    store.set(KEY, JSON.stringify({ language: 'de' }));
    expect(loadUserSettings().language).toBe('uk');
    store.set(KEY, JSON.stringify({ language: 42 }));
    expect(loadUserSettings().language).toBe('uk');
  });

  it('round-trips en', () => {
    saveUserSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    expect(loadUserSettings().language).toBe('en');
  });
});

describe('mergeSettings', () => {
  it('keeps language when patching another field', () => {
    const prev = { ...DEFAULT_SETTINGS, language: 'en' as const };
    const next = mergeSettings(prev, { theme: 'paper' });
    expect(next.language).toBe('en');
    expect(next.theme).toBe('paper');
  });

  it('applies a language patch', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, { language: 'en' }).language).toBe('en');
  });
});
