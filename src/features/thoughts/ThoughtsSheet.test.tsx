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

describe('ThoughtsSheet session section (0.27)', () => {
  it('puts this reading above older thoughts when sessionSince is set', async () => {
    await addThoughtNote('older thought');
    await new Promise((r) => setTimeout(r, 5));
    const since = Date.now();
    await addThoughtNote('fresh thought');
    render(<ThoughtsSheet sessionSince={since} onClose={() => {}} />);
    const heading = await screen.findByRole('heading', { name: uk.thoughts.thisSession });
    const fresh = screen.getByText('fresh thought');
    const older = screen.getByText('older thought');
    expect(heading.compareDocumentPosition(fresh) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fresh.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has no such heading without the prop', async () => {
    await addThoughtNote('a thought');
    render(<ThoughtsSheet onClose={() => {}} />);
    await screen.findByText('a thought');
    expect(screen.queryByRole('heading', { name: uk.thoughts.thisSession })).toBeNull();
  });
});
