import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says calmly that the thoughts were saved', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:thoughts');
    URL.revokeObjectURL = vi.fn();
    await addThoughtNote('buy coffee');
    render(<ThoughtsSheet onClose={() => {}} />);
    expect(screen.getByRole('status').textContent).toBe('');
    await userEvent.click(await screen.findByRole('button', { name: uk.thoughts.export }));
    expect((await screen.findByRole('status')).textContent).toBe(uk.thoughts.exported);
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

describe('ThoughtsSheet focus (0.27)', () => {
  it('focuses the input when opened to park a thought', async () => {
    render(<ThoughtsSheet onClose={() => {}} />);
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText(uk.thoughts.placeholder)
    );
  });

  it('leaves the input alone when opened to read this reading’s thoughts', async () => {
    await addThoughtNote('a thought');
    render(<ThoughtsSheet sessionSince={0} onClose={() => {}} />);
    await screen.findByText('a thought');
    expect(document.activeElement).not.toBe(
      screen.getByPlaceholderText(uk.thoughts.placeholder)
    );
  });
});
