import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../../package.json';
import { format } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { uk } from '../../i18n/locales/uk';
import { createBackStack, type BackStack } from '../../services/navigation/backStack';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsSheet } from './SettingsSheet';
import { sentenceCase } from './settingsSummary';
import { installFakeSpeech, voice, type FakeSpeech } from '../../../test/fakeSpeech';

/** A back stack over a fake history, so a test can press "back". */
const nav = vi.hoisted(() => ({ stack: null as BackStack | null, back: () => {} }));
vi.mock('../../services/navigation/appBackStack', () => ({ appBackStack: () => nav.stack! }));
vi.mock('../../services/storage/backup', () => ({
  importLibraryBackup: vi.fn(async () => ({ importedDocs: 2, importedThoughts: 0, appliedSettings: null }))
}));

beforeEach(() => {
  const listeners = new Set<() => void>();
  const fire = () => listeners.forEach((l) => l());
  nav.stack = createBackStack(
    { state: null, pushState: () => {}, go: fire },
    { addEventListener: (_t, l) => listeners.add(l), removeEventListener: (_t, l) => listeners.delete(l) }
  );
  nav.back = fire;
});

function stubStorage(persisted: boolean, persistAnswer = false, usage = { bytes: 3_590_000 }) {
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
      estimate: async () => ({ usage: usage.bytes, quota: 1e9 })
    }
  });
  return persist;
}

/** Rows are named "Title, summary": match by the title. */
const row = (title: string) =>
  screen.getByRole('button', { name: (name) => name === title || name.startsWith(`${title}, `) });

async function openSection(title: string) {
  await userEvent.click(row(title));
  return screen.getByRole('heading', { name: title });
}

const S = uk.settings.sections;

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.getState().updateSettings({
    language: 'uk',
    theme: 'dark',
    fontFamily: 'sans',
    fontSize: 22,
    anchorMode: false,
    sentenceFocus: false,
    syllableHints: false
  });
});

describe('SettingsSheet first screen (0.27)', () => {
  it('shows five rows whose names carry the title and the summary', () => {
    render(<SettingsSheet onClose={() => {}} />);
    expect(screen.getByRole('button', { name: `${S.appearance}, Темна, Fixel, 22 px` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${S.aids}, ${uk.settings.aidsOff}` })).toBeTruthy();
    for (const title of [S.appearance, S.reading, S.aids, S.sound, S.languageLibrary]) {
      expect(row(title)).toBeTruthy();
    }
    // The controls themselves live inside the sections.
    expect(screen.queryByRole('checkbox', { name: uk.settings.anchor })).toBeNull();
  });

  it('summaries update live', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.aids);
    await userEvent.click(screen.getByRole('checkbox', { name: uk.settings.anchor }));
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    expect(screen.getByRole('button', { name: `${S.aids}, ${sentenceCase(uk.settings.summary.aids.anchor, 'uk')}` })).toBeTruthy();
  });

  it('opens a section with focus on its heading, and back returns focus to the row', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    const heading = await openSection(S.sound);
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByRole('button', { name: (n) => n.startsWith(`${S.appearance}, `) })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    expect(screen.queryByRole('heading', { name: S.sound })).toBeNull();
    expect(document.activeElement).toBe(row(S.sound));
  });

  it('the list slides in only on the way back, never when Settings opens', async () => {
    const { container } = render(<SettingsSheet onClose={() => {}} />);
    const list = () => container.querySelector('.settings-screen-list')!;
    expect(list().classList.contains('is-returning')).toBe(false);
    await openSection(S.sound);
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    expect(list().classList.contains('is-returning')).toBe(true);
  });

  it('Escape in a section goes back; Escape on the first screen closes', async () => {
    const onClose = vi.fn();
    render(<SettingsSheet onClose={onClose} />);
    await openSection(S.reading);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: S.reading })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(row(S.reading));

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Escape does not reach the screen behind the sheet', async () => {
    const behind = vi.fn();
    document.addEventListener('keydown', behind);
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.reading);
    await userEvent.keyboard('{Escape}');
    document.removeEventListener('keydown', behind);
    expect(behind).not.toHaveBeenCalled();
  });

  it('the system back gesture inside a section returns to the first screen', async () => {
    const onClose = vi.fn();
    render(<SettingsSheet onClose={onClose} />);
    await openSection(S.appearance);
    act(() => nav.back());
    expect(screen.queryByRole('heading', { name: S.appearance })).toBeNull();
    expect(row(S.appearance)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('from the library: no timer or brown noise, and restore is offered', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.reading);
    expect(screen.queryByRole('radiogroup', { name: uk.settings.timer })).toBeNull();
    expect(screen.getByRole('checkbox', { name: uk.settings.timeLeft })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));

    await openSection(S.sound);
    expect(screen.queryByRole('checkbox', { name: uk.settings.brownNoise })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));

    await openSection(S.languageLibrary);
    expect(screen.getByRole('button', { name: uk.settings.backupSave })).toBeTruthy();
    expect(screen.getByRole('button', { name: uk.settings.backupRestore })).toBeTruthy();
  });

  it('from the reader: timer and brown noise, save but no restore', async () => {
    render(
      <SettingsSheet
        onClose={() => {}}
        onTimerSelect={() => {}}
        brownNoiseOn={false}
        onToggleBrownNoise={() => {}}
      />
    );
    await openSection(S.reading);
    expect(screen.getByRole('radiogroup', { name: uk.settings.timer })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    await openSection(S.sound);
    expect(screen.getByRole('checkbox', { name: uk.settings.brownNoise })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    await openSection(S.languageLibrary);
    expect(screen.getByRole('button', { name: uk.settings.backupSave })).toBeTruthy();
    expect(screen.queryByRole('button', { name: uk.settings.backupRestore })).toBeNull();
  });

  it('the time-left switch is on by default and saves', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.reading);
    const sw = screen.getByRole('checkbox', { name: uk.settings.timeLeft }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    await userEvent.click(sw);
    expect(useSettingsStore.getState().showTimeLeft).toBe(false);
    act(() => useSettingsStore.getState().updateSettings({ showTimeLeft: true }));
  });

  it('shows the app version from package.json in the UI language', () => {
    render(<SettingsSheet onClose={() => {}} />);

    expect(screen.getByText(format(uk.settings.version, { version: pkg.version }))).toBeTruthy();

    act(() => useSettingsStore.getState().updateSettings({ language: 'en' }));

    expect(screen.getByText(format(en.settings.version, { version: pkg.version }))).toBeTruthy();
  });
});

describe('SettingsSheet storage (Language and library)', () => {
  it('says nothing about storage where the browser has no StorageManager', async () => {
    render(<SettingsSheet onClose={() => {}} />);
    expect(screen.getByRole('button', { name: `${S.languageLibrary}, Українська` })).toBeTruthy();
    await openSection(S.languageLibrary);
    expect(screen.queryByText(uk.settings.storageNotProtected)).toBeNull();
    expect(screen.queryByText(uk.settings.storageProtected)).toBeNull();
  });

  it('shows usage on the row and a calm protected line in the section', async () => {
    stubStorage(true);
    render(<SettingsSheet onClose={() => {}} />);

    expect(
      await screen.findByRole('button', { name: `${S.languageLibrary}, Українська, 3,4 МБ` })
    ).toBeTruthy();
    await openSection(S.languageLibrary);
    expect(await screen.findByText(uk.settings.storageProtected)).toBeTruthy();
    expect(screen.getByText(format(uk.settings.storageUsage, { size: '3,4 МБ' }))).toBeTruthy();
    expect(screen.queryByRole('button', { name: uk.settings.storageProtect })).toBeNull();
  });

  it('lets the reader ask the browser to keep the library', async () => {
    const persist = stubStorage(false, true);
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.languageLibrary);

    expect(await screen.findByText(uk.settings.storageNotProtected)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.storageProtect }));

    expect(persist).toHaveBeenCalledOnce();
    expect(await screen.findByText(uk.settings.storageProtected)).toBeTruthy();
  });

  it('a restore refreshes the usage line and the row summary', async () => {
    const usage = { bytes: 3_590_000 };
    stubStorage(true, true, usage);
    render(<SettingsSheet onClose={() => {}} />);
    await screen.findByRole('button', { name: `${S.languageLibrary}, Українська, 3,4 МБ` });
    await openSection(S.languageLibrary);

    usage.bytes = 7_340_032;
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, new File(['{}'], 'plyn-backup.json', { type: 'application/json' }));

    expect(await screen.findByText(format(uk.settings.storageUsage, { size: '7 МБ' }))).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: uk.settings.back }));
    expect(screen.getByRole('button', { name: `${S.languageLibrary}, Українська, 7 МБ` })).toBeTruthy();
  });

  it('stays calm when the browser says no', async () => {
    stubStorage(false, false);
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.languageLibrary);

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

  const renderSound = async () => {
    render(<SettingsSheet onClose={() => {}} />);
    await openSection(S.sound);
  };

  it('shows the highlight switch, off by default', async () => {
    await renderSound();
    const sw = screen.getByRole('checkbox', { name: uk.settings.wordHighlight }) as HTMLInputElement;
    expect(sw.checked).toBe(false);
    await userEvent.click(sw);
    expect(useSettingsStore.getState().ttsWordHighlight).toBe(true);
  });

  it('lists only Ukrainian voices in the Ukrainian select, default first', async () => {
    await renderSound();
    const select = screen.getByRole('combobox', { name: uk.settings.voiceUk });
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options).toEqual([uk.settings.voiceDefault, 'lesya']);
  });

  it('marks network voices', async () => {
    await renderSound();
    const select = screen.getByRole('combobox', { name: uk.settings.voiceEn });
    expect(screen.getByRole('option', { name: format(uk.settings.voiceNetwork, { name: 'Daniel' }) })).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('');
  });

  it('choosing a voice saves it and speaks the sample in that voice', async () => {
    await renderSound();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: uk.settings.voiceUk }), 'lesya');
    expect(useSettingsStore.getState().ttsVoices).toEqual({ uk: 'lesya' });
    const sample = fake.spoken.at(-1)!;
    expect(sample.text).toBe(uk.settings.voiceSamples.uk);
    expect(sample.voice?.voiceURI).toBe('lesya');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: uk.settings.voiceUk }), '');
    expect(useSettingsStore.getState().ttsVoices).toEqual({});
  });

  it('updates when voices arrive late', async () => {
    fake.setVoices([]);
    await renderSound();
    const select = screen.getByRole('combobox', { name: uk.settings.voiceUk }) as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    act(() => fake.setVoices([voice('lesya', 'uk-UA')]));
    expect(select.options).toHaveLength(2);
  });

  it('disables listening controls without speechSynthesis', async () => {
    fake.uninstall();
    await renderSound();
    expect((screen.getByRole('checkbox', { name: uk.settings.wordHighlight }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: uk.settings.voiceUk }) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(uk.settings.speechUnavailable)).toBeTruthy();
  });
});
