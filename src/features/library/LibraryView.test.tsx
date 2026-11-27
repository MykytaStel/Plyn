import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlynDocument } from '../../core/models/types';
import { uk } from '../../i18n/locales/uk';
import { addThoughtNote, db, putDocument } from '../../services/storage/db';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LibraryView } from './LibraryView';

function doc(id: string, completedOnce: boolean): PlynDocument {
  return {
    id,
    schemaVersion: 1,
    title: `Text ${id}`,
    text: 'one two three four five',
    charOffset: 0,
    currentIndex: 0,
    totalCards: 1,
    createdAt: 0,
    updatedAt: Number(id),
    bookmarkOffsets: [],
    completedOnce
  };
}

beforeEach(async () => {
  localStorage.setItem('plyn_onboarding_done_v1', '1');
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  await db.documents.clear();
  await db.texts.clear();
});

describe('LibraryView micro start', () => {
  it('is offered for an unfinished text', async () => {
    await putDocument(doc('1', false));
    render(<LibraryView />);
    expect(await screen.findByText(uk.library.microStartLabel)).toBeTruthy();
  });

  it('is not offered when every text is finished', async () => {
    await putDocument(doc('1', true));
    await putDocument(doc('2', true));
    render(<LibraryView />);
    await screen.findByText('Text 1');
    expect(screen.queryByText(uk.library.microStartLabel)).toBeNull();
  });
});

describe('LibraryView session thoughts toast (0.27)', () => {
  it('shows once and its action opens the sheet with the heading', async () => {
    await db.thoughts.clear();
    const since = Date.now();
    await addThoughtNote('fresh thought');
    useReaderStore.setState({ lastSessionThoughts: { count: 1, since } });

    const { unmount } = render(<LibraryView />);
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();
    const view = await screen.findByRole('button', { name: uk.library.sessionThoughtsView });
    await userEvent.click(view);
    expect(
      await screen.findByRole('heading', { name: uk.thoughts.thisSession })
    ).toBeTruthy();

    unmount();
    render(<LibraryView />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: uk.library.sessionThoughtsView })).toBeNull()
    );
  });
});
