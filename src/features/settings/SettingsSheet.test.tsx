import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../../package.json';
import { format } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from './SettingsSheet';

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
