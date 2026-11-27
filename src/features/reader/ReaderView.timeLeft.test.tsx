import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentChapter } from '../../core/models/types';
import { splitTextIntoCards } from '../../core/splitter/splitter';
import { format } from '../../i18n';
import { uk } from '../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../services/storage/settingsStorage';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ReaderView } from './ReaderView';

const text = Array.from({ length: 900 }, () => 'слово').join(' ') + '.';

function open(settings: Partial<typeof DEFAULT_SETTINGS>, chapterAtCard?: number) {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...settings });
  const cards = splitTextIntoCards(text, { lengthPreset: 'medium' });
  const chapters: DocumentChapter[] | undefined =
    chapterAtCard === undefined
      ? undefined
      : [
          { title: 'A', offset: 0, level: 0 },
          { title: 'B', offset: cards[chapterAtCard].startOffset, level: 0 }
        ];
  useReaderStore.setState({
    activeDoc: {
      id: 'd',
      title: 'T',
      text,
      charOffset: 0,
      createdAt: 0,
      updatedAt: 0,
      bookmarkOffsets: [],
      chapters
    } as never,
    cards,
    currentIndex: 0
  });
  return cards;
}

function describedBy(el: HTMLElement) {
  const id = el.getAttribute('aria-describedby');
  return id ? document.getElementById(id)?.textContent : undefined;
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

// 900 words at the calm 180 wpm: 5 min to the end of the text.
describe('reader header time left', () => {
  it('shows the time left and names it without a tilde', () => {
    const total = open({ showTimeLeft: true }).length;
    render(<ReaderView />);
    const description = format(uk.reader.timeLeft.toTextEnd, {
      time: format(uk.reader.timeLeft.minPlain, { n: 5 })
    });
    const counter = screen.getByRole('button', { name: new RegExp(`^1 / ${total}`) });
    expect(counter.textContent).toMatch(/~5 хв/);
    expect(counter.getAttribute('aria-label')).toBeNull();
    expect(describedBy(counter)).toBe(description);
    expect(description).not.toContain('~');
    // Only the description: a browse cursor does not meet it as stray text.
    expect(document.getElementById('counter-time-left')?.hidden).toBe(true);
  });

  it('names the chapter end when a chapter follows', () => {
    const cards = open({ showTimeLeft: true }, 3);
    render(<ReaderView />);
    const words = cards.slice(0, 3).reduce((n, c) => n + c.text.split(/\s+/).length, 0);
    const minutes = Math.ceil(words / 180);
    const description = format(uk.reader.timeLeft.toChapterEnd, {
      time: format(uk.reader.timeLeft.minPlain, { n: minutes })
    });
    expect(
      describedBy(screen.getByRole('button', { name: new RegExp(`^1 / ${cards.length}`) }))
    ).toBe(description);
  });

  it('shows only the counter when showTimeLeft is off', () => {
    const total = open({ showTimeLeft: false }).length;
    render(<ReaderView />);
    const counter = screen.getByTitle(uk.reader.counterHint);
    expect(counter.textContent).toBe(`1 / ${total}`);
    expect(counter.getAttribute('aria-describedby')).toBeNull();
  });
});
