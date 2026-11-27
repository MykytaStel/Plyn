import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { uk } from '../../i18n/locales/uk';
import { addThoughtNote, db } from '../../services/storage/db';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ThoughtsSheet } from './ThoughtsSheet';

beforeEach(async () => {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  await db.thoughts.clear();
});

describe('ThoughtsSheet export', () => {
  it('has no export button with 0 thoughts', async () => {
    render(<ThoughtsSheet onClose={() => {}} />);
    expect(await screen.findByText(uk.thoughts.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: uk.thoughts.export })).toBeNull();
  });

  it('shows the export button with at least one thought', async () => {
    await addThoughtNote('buy coffee');
    render(<ThoughtsSheet onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: uk.thoughts.export })).toBeTruthy();
  });
});
