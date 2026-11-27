import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../../package.json';
import { format } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from './SettingsSheet';
import { installFakeSpeech, voice, type FakeSpeech } from '../../../test/fakeSpeech';

function stubStorage(persisted: boolean, persistAnswer = false) {
  const state = { persisted };
  const persist = vi.fn(async () => {
    state.persisted = persistAnswer;
    return persistAnswer;
  });
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      persisted: async () => state.persisted,
      persist,
      estimate: async () => ({ usage: 3_590_000, quota: 1e9 })
    }
  });
  return persist;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.getState().updateSettings({ language: 'uk', theme: 'dark' });
});

describe('SettingsSheet', () => {
  it('shows the app version from package.json in the UI language', () => {
    render(<SettingsSheet onClose={() => {}} />);

    expect(screen.getByText(format(uk.settings.version, { version: pkg.version }))).toBeTruthy();

    act(() => useSettingsStore.getState().updateSettings({ language: 'en' }));

    expect(screen.getByText(format(en.settings.version, { version: pkg.version }))).toBeTruthy();
  });

  it('says nothing about storage where the browser has no StorageManager', () => {
    render(<SettingsSheet onClose={() => {}} />);
    expect(screen.queryByRole('heading', { name: uk.settings.sections.library })).toBeNull();
  });

  it('shows usage and a calm protected line', async () => {
    stubStorage(true);
    render(<SettingsSheet onClose={() => {}} />);

    expect(await screen.findByText(uk.settings.storageProtected)).toBeTruthy();
    expect(screen.getByText(format(uk.settings.storageUsage, { size: '3,4 МБ' }))).toBeTruthy();
    expect(screen.queryByRole('button', { name: uk.settings.storageProtect })).toBeNull();
  });

  it('lets the reader ask the browser to keep the library', async () => {
    const persist = stubStorage(false, true);
    render(<SettingsSheet onClose={() => {}} />);

    expect(await screen.findByText(uk.settings.storageNotProtected)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.storageProtect }));

    expect(persist).toHaveBeenCalledOnce();
    expect(await screen.findByText(uk.settings.storageProtected)).toBeTruthy();
  });

  it('stays calm when the browser says no', async () => {
    stubStorage(false, false);
    render(<SettingsSheet onClose={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: uk.settings.storageProtect }));
    expect(await screen.findByText(uk.settings.storageDenied)).toBeTruthy();
  });
});

describe('SettingsSheet listening (0.26)', () => {
  let fake: FakeSpeech;
  beforeEach(() => {
    fake = installFakeSpeech([
      voice('lesya', 'uk-UA'),
      { ...voice('daniel', 'en-GB', false), name: 'Daniel' },
      voice('anna', 'de-DE')
    ]);
    useSettingsStore.getState().updateSettings({ ttsWordHighlight: false, ttsVoices: {} });
  });
  afterEach(() => fake.uninstall());

  it('shows the highlight switch, off by default', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    const sw = screen.getByRole('checkbox', { name: uk.settings.wordHighlight }) as HTMLInputElement;
    expect(sw.checked).toBe(false);
    await userEvent.click(sw);
    expect(useSettingsStore.getState().ttsWordHighlight).toBe(true);
  });

  it('lists only Ukrainian voices in the Ukrainian select, default first', () => {
    render(<SettingsSheet onClose={() => {}} />);
    const select = screen.getByRole('combobox', { name: uk.settings.voiceUk });
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options).toEqual([uk.settings.voiceDefault, 'lesya']);
  });

  it('marks network voices', () => {
    render(<SettingsSheet onClose={() => {}} />);
    const select = screen.getByRole('combobox', { name: uk.settings.voiceEn });
    expect(screen.getByRole('option', { name: format(uk.settings.voiceNetwork, { name: 'Daniel' }) })).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('');
  });

  it('choosing a voice saves it and speaks the sample in that voice', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: uk.settings.voiceUk }), 'lesya');
    expect(useSettingsStore.getState().ttsVoices).toEqual({ uk: 'lesya' });
    const sample = fake.spoken.at(-1)!;
    expect(sample.text).toBe(uk.settings.voiceSamples.uk);
    expect(sample.voice?.voiceURI).toBe('lesya');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: uk.settings.voiceUk }), '');
    expect(useSettingsStore.getState().ttsVoices).toEqual({});
  });

  it('updates when voices arrive late', () => {
    fake.setVoices([]);
    render(<SettingsSheet onClose={() => {}} />);
    const select = screen.getByRole('combobox', { name: uk.settings.voiceUk }) as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    act(() => fake.setVoices([voice('lesya', 'uk-UA')]));
    expect(select.options).toHaveLength(2);
  });

  it('disables listening controls without speechSynthesis', () => {
    fake.uninstall();
    render(<SettingsSheet onClose={() => {}} />);
    expect((screen.getByRole('checkbox', { name: uk.settings.wordHighlight }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: uk.settings.voiceUk }) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(uk.settings.speechUnavailable)).toBeTruthy();
  });
});
