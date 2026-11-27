import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { splitTextIntoCards } from '../../core/splitter/splitter';
import { uk } from '../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ReaderView } from './ReaderView';

const text = Array.from({ length: 900 }, () => 'слово').join(' ') + '.';

function open(settings: Partial<typeof DEFAULT_SETTINGS>) {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...settings });
  const cards = splitTextIntoCards(text, { lengthPreset: 'medium' });
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
    cards,
    currentIndex: 0
  });
  return cards.length;
}

beforeEach(() => {
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
  useReaderStore.setState({ activeDoc: null });
});

describe('reader header time left', () => {
  it('shows the time left and names it in the accessible name', () => {
    const total = open({ showTimeLeft: true });
    render(<ReaderView />);
    const counter = screen.getByRole('button', { name: new RegExp(`1 / ${total}`) });
    expect(counter.textContent).toMatch(/~\d+ хв/);
    expect(counter.getAttribute('aria-label')).toContain(
      uk.reader.timeLeft.toTextEnd.split('{time}')[0].trim()
    );
  });

  it('shows only the counter when showTimeLeft is off', () => {
    const total = open({ showTimeLeft: false });
    render(<ReaderView />);
    const counter = screen.getByTitle(uk.reader.counterHint);
    expect(counter.textContent).toBe(`1 / ${total}`);
  });
});
