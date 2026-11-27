import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReadingCard } from '../../../core/models/types';
import * as db from '../../../services/storage/db';
import { useReadingPace } from './useReadingPace';

const TEXTS = ['one two three four five', 'six seven eight', 'nine ten'];

function makeCards(): ReadingCard[] {
  let offset = 0;
  return TEXTS.map((text, index) => {
    const card = { index, text, startOffset: offset, endOffset: offset + text.length };
    offset += text.length + 1;
    return card;
  });
}

let spy: ReturnType<typeof vi.spyOn>;
const cards = makeCards();

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

function render(initial: { currentIndex: number; isSpeaking: boolean }) {
  return renderHook((props) => useReadingPace({ cards, ...props }), { initialProps: initial });
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
  spy = vi.spyOn(db, 'recordProgressDelta').mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  spy.mockRestore();
});

describe('useReadingPace', () => {
  it('records the words of the card left after a real dwell', () => {
    const { rerender } = render({ currentIndex: 0, isSpeaking: false });
    act(() => void vi.advanceTimersByTime(10_000));
    rerender({ currentIndex: 1, isSpeaking: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ paceSample: { words: 5, ms: 10_000 } });
  });

  it('records nothing after a 1 s dwell', () => {
    const { rerender } = render({ currentIndex: 0, isSpeaking: false });
    act(() => void vi.advanceTimersByTime(1000));
    rerender({ currentIndex: 1, isSpeaking: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('records nothing while speaking', () => {
    const { rerender } = render({ currentIndex: 0, isSpeaking: true });
    act(() => void vi.advanceTimersByTime(10_000));
    rerender({ currentIndex: 1, isSpeaking: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it('restarts the dwell when the page becomes visible again', () => {
    const { rerender } = render({ currentIndex: 0, isSpeaking: false });
    act(() => void vi.advanceTimersByTime(2000));
    setVisibility('hidden');
    act(() => void vi.advanceTimersByTime(60_000));
    setVisibility('visible');
    act(() => void vi.advanceTimersByTime(3000));
    rerender({ currentIndex: 1, isSpeaking: false });
    expect(spy).toHaveBeenCalledWith({ paceSample: { words: 5, ms: 3000 } });
  });

  it('returns the calm pace without learned samples', () => {
    const { result } = render({ currentIndex: 0, isSpeaking: false });
    expect(result.current).toBe(180);
  });
});
