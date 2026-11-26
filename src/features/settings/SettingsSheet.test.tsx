import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { format } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from './SettingsSheet';

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
});
