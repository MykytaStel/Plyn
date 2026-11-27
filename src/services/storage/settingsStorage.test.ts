import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadUserSettings,
  mergeSettings,
  parseSettings,
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

describe('parseSettings (backup files)', () => {
  it('keeps valid values and replaces invalid ones with defaults', () => {
    const parsed = parseSettings({
      theme: 'mint',
      fontFamily: 'comic',
      fontSize: 500,
      lineHeight: 1.8,
      anchorMode: 'yes',
      ttsRate: 1.25,
      language: 'en',
      extra: 'ignored'
    });
    expect(parsed).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'mint',
      lineHeight: 1.8,
      ttsRate: 1.25,
      language: 'en'
    });
  });

  it('returns null for anything that is not an object', () => {
    expect(parseSettings(null)).toBeNull();
    expect(parseSettings('dark')).toBeNull();
    expect(parseSettings([])).toBeNull();
  });
});

describe('listening settings (0.26)', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installLocalStorage();
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('defaults the new listening fields', () => {
    store.set(KEY, JSON.stringify({ theme: 'paper', ttsRate: 1.25 }));
    const s = loadUserSettings();
    expect(s.ttsWordHighlight).toBe(false);
    expect(s.ttsVoices).toEqual({});
    expect(DEFAULT_SETTINGS.ttsWordHighlight).toBe(false);
  });

  it('keeps only known languages and string voice ids', () => {
    const raw = { ttsVoices: { uk: 'a', en: 5, de: 'x' } };
    expect(parseSettings(raw)!.ttsVoices).toEqual({ uk: 'a' });
    store.set(KEY, JSON.stringify(raw));
    expect(loadUserSettings().ttsVoices).toEqual({ uk: 'a' });
  });

  it('drops a voice id longer than 512 characters and a non-object', () => {
    expect(parseSettings({ ttsVoices: { en: 'x'.repeat(513) } })!.ttsVoices).toEqual({});
    expect(parseSettings({ ttsVoices: ['uk'] })!.ttsVoices).toEqual({});
    expect(parseSettings({ ttsWordHighlight: 'yes' })!.ttsWordHighlight).toBe(false);
  });

  it('mergeSettings replaces ttsVoices as a whole', () => {
    const prev = { ...DEFAULT_SETTINGS, ttsVoices: { uk: 'a', en: 'b' } };
    expect(mergeSettings(prev, { ttsVoices: { uk: 'c' } }).ttsVoices).toEqual({ uk: 'c' });
    expect(mergeSettings(prev, { ttsWordHighlight: true }).ttsVoices).toEqual({ uk: 'a', en: 'b' });
  });
});
