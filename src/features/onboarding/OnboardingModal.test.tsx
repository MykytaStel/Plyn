import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { useSettingsStore } from '../../store/useSettingsStore';
import { isOnboardingDone, OnboardingModal } from './OnboardingModal';

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.getState().updateSettings({ language: 'uk', theme: 'dark' });
});

function renderModal() {
  const onClose = vi.fn();
  const onTrySample = vi.fn();
  render(<OnboardingModal onClose={onClose} onTrySample={onTrySample} />);
  return { onClose, onTrySample };
}

describe('OnboardingModal', () => {
  it('is shown once: skipping marks it done', async () => {
    expect(isOnboardingDone()).toBe(false);
    const { onClose } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: uk.onboarding.skip }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(isOnboardingDone()).toBe(true);
  });

  it('closes on Escape and stays closed', async () => {
    const { onClose } = renderModal();
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(isOnboardingDone()).toBe(true);
  });

  it('theme choices are radios, and picking one changes the theme', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: uk.onboarding.next }));

    const group = screen.getByRole('radiogroup', { name: uk.settings.theme });
    expect(group).toBeTruthy();
    const paper = screen.getByRole('radio', { name: uk.settings.themes.paper });
    expect(paper.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(paper);

    expect(useSettingsStore.getState().theme).toBe('paper');
    expect(paper.getAttribute('aria-checked')).toBe('true');
  });

  it('the last step can start the sample text', async () => {
    const { onTrySample } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: uk.onboarding.next }));
    await userEvent.click(screen.getByRole('button', { name: uk.onboarding.next }));
    await userEvent.click(screen.getByRole('button', { name: uk.onboarding.trySample }));

    expect(onTrySample).toHaveBeenCalledOnce();
  });

  it('follows the UI language without a reload', () => {
    useSettingsStore.getState().updateSettings({ language: 'en' });
    renderModal();
    expect(screen.getByRole('heading', { name: en.onboarding.step1.title })).toBeTruthy();
  });
});
