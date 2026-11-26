import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AppErrorBoundary } from './AppErrorBoundary';

function Broken(): never {
  throw new Error('boom');
}

beforeEach(() => {
  useSettingsStore.getState().updateSettings({ language: 'uk' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('AppErrorBoundary', () => {
  it('renders children while nothing fails', () => {
    render(
      <AppErrorBoundary>
        <p>fine</p>
      </AppErrorBoundary>
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });

  it('shows a calm screen that can still save a backup', async () => {
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: uk.errorScreen.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: uk.errorScreen.reload })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: uk.errorScreen.saveBackup }));
    expect(await screen.findByText(uk.errorScreen.backupSaved)).toBeTruthy();
  });

  it('uses the current UI language', () => {
    useSettingsStore.getState().updateSettings({ language: 'en' });
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: en.errorScreen.title })).toBeTruthy();
  });
});
