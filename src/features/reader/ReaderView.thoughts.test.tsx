import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { splitTextIntoCards } from '../../core/splitter/splitter';
import { uk } from '../../i18n/locales/uk';
import { addThoughtNote, db } from '../../services/storage/db';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ReaderView } from './ReaderView';

const text = Array.from({ length: 300 }, () => 'слово').join(' ') + '.';

beforeEach(async () => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
  );
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  await db.thoughts.clear();
  useReaderStore.setState({
    activeDoc: {
      id: 'd',
      title: 'T',
      text,
      charOffset: 0,
      createdAt: 0,
      updatedAt: 0,
      bookmarkOffsets: []
    } as never,
    cards: splitTextIntoCards(text, { lengthPreset: 'medium' }),
    currentIndex: 0,
    sessionStartedAt: Date.now() - 1000
  });
  await addThoughtNote('parked');
});

describe('reader thoughts sheet heading (0.27)', () => {
  it('is absent when opened from the toolbar', async () => {
    render(<ReaderView />);
    await userEvent.click(screen.getByRole('button', { name: uk.reader.parkThought }));
    await screen.findByText('parked');
    expect(screen.queryByRole('heading', { name: uk.thoughts.thisSession })).toBeNull();
  });

  it('is present when opened from the Done slide', async () => {
    render(<ReaderView />);
    await userEvent.click(
      await screen.findByRole('button', { name: uk.reader.doneSlide.viewThoughts })
    );
    expect(
      await screen.findByRole('heading', { name: uk.thoughts.thisSession })
    ).toBeTruthy();
  });
});
