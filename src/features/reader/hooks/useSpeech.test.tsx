import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeSpeech, voice, type FakeSpeech } from '../../../../test/fakeSpeech';
import type { DocumentChapter, ReadingCard } from '../../../core/models/types';
import { format } from '../../../i18n';
import { uk } from '../../../i18n/locales/uk';
import { DEFAULT_SETTINGS } from '../../../services/storage/settingsStorage';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useSpeech } from './useSpeech';

const TEXTS = ['Перша картка тут.', 'Друга картка тут.', 'Третя картка тут.', 'Fourth card here.'];

function makeCards(): ReadingCard[] {
  let offset = 0;
  return TEXTS.map((text, index) => {
    const card = { index, text, startOffset: offset, endOffset: offset + text.length };
    offset += text.length + 1;
    return card;
  });
}

let fake: FakeSpeech;
let cards: ReadingCard[];

function setup(chapters: DocumentChapter[] = [], settings: Partial<typeof DEFAULT_SETTINGS> = {}) {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, ttsAutoAdvance: true, ...settings });
  const scrollToCard = vi.fn();
  const showToast = vi.fn();
  const hook = renderHook(() => useSpeech({ scrollToCard, chapters, showToast }));
  return { hook, scrollToCard, showToast };
}

beforeEach(() => {
  fake = installFakeSpeech([voice('lesya', 'uk-UA'), voice('daniel', 'en-GB')]);
  cards = makeCards();
  useReaderStore.setState({ cards, currentIndex: 0, recordTtsListened: vi.fn(async () => {}) });
});
afterEach(() => fake.uninstall());

describe('useSpeech', () => {
  it('queues the next card when a card starts and scrolls when it starts speaking', () => {
    const { hook, scrollToCard } = setup();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    expect(fake.spoken.map((u) => u.text)).toEqual([TEXTS[0], TEXTS[1]]);
    act(() => fake.end());
    act(() => fake.start());
    expect(scrollToCard).toHaveBeenCalledWith(1);
    const cancels = fake.cancelCount;
    act(() => useReaderStore.setState({ currentIndex: 1 }));
    hook.rerender();
    expect(fake.cancelCount).toBe(cancels);
    expect(hook.result.current.isSpeaking).toBe(true);
    expect(fake.spoken.map((u) => u.text)).toEqual([TEXTS[0], TEXTS[1], TEXTS[2]]);
  });

  it('stops at the first card of a new chapter', () => {
    const chapters = [{ title: 'Частина друга', offset: cards[2].startOffset, level: 0 }];
    const { hook, scrollToCard, showToast } = setup(chapters);
    act(() => useReaderStore.setState({ currentIndex: 1 }));
    hook.rerender();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    expect(fake.spoken.map((u) => u.text)).toEqual([TEXTS[1]]);
    act(() => fake.end());
    expect(scrollToCard).toHaveBeenCalledWith(2);
    expect(hook.result.current.isSpeaking).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      format(uk.reader.toasts.chapterStop, { title: 'Частина друга' })
    );
    act(() => useReaderStore.setState({ currentIndex: 2 }));
    hook.rerender();
    expect(fake.spoken).toHaveLength(1);
  });

  it('ends after the last card without queueing', () => {
    const { hook, showToast } = setup();
    act(() => useReaderStore.setState({ currentIndex: 3 }));
    hook.rerender();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    act(() => fake.end());
    expect(fake.spoken).toHaveLength(1);
    expect(hook.result.current.isSpeaking).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('stops the queue when the reader turns a card by hand', () => {
    const { hook, scrollToCard } = setup();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    const queued = fake.spoken[1];
    act(() => useReaderStore.setState({ currentIndex: 3 }));
    hook.rerender();
    expect(hook.result.current.isSpeaking).toBe(false);
    act(() => queued.onstart?.(new Event('start')));
    expect(scrollToCard).not.toHaveBeenCalled();
  });

  it('continues without auto-advance turned on only when asked', () => {
    const { hook } = setup([], { ttsAutoAdvance: false });
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    act(() => fake.end());
    expect(fake.spoken).toHaveLength(1);
    expect(hook.result.current.isSpeaking).toBe(false);
  });

  it('a settings change restarts nothing mid-card', () => {
    const { hook } = setup();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    const count = fake.spoken.length;
    act(() => useSettingsStore.setState({ ttsRate: 1.5 }));
    hook.rerender();
    expect(fake.spoken).toHaveLength(count);
    expect(hook.result.current.isSpeaking).toBe(true);
  });

  it('exposes spokenRange only with the highlight on', () => {
    const off = setup();
    act(() => off.hook.result.current.toggleSpeech());
    act(() => fake.start());
    act(() => fake.word(0, 5));
    expect(off.hook.result.current.spokenRange).toBeNull();
    off.hook.unmount();

    const on = setup([], { ttsWordHighlight: true });
    act(() => on.hook.result.current.toggleSpeech());
    act(() => fake.start());
    act(() => fake.word(6, 6));
    expect(on.hook.result.current.spokenRange).toEqual({ cardIndex: 0, start: 6, end: 12 });
  });

  it('clears spokenRange at a card change and on stop', () => {
    const { hook } = setup([], { ttsWordHighlight: true });
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    act(() => fake.word(0, 5));
    act(() => fake.end());
    expect(hook.result.current.spokenRange).toBeNull();
    act(() => fake.start());
    act(() => fake.word(0, 5));
    expect(hook.result.current.spokenRange?.cardIndex).toBe(1);
    act(() => hook.result.current.toggleSpeech());
    expect(hook.result.current.spokenRange).toBeNull();
  });

  it('passes the voice for the card content language', () => {
    const { hook } = setup([], { ttsVoices: { uk: 'lesya', en: 'daniel' } });
    act(() => useReaderStore.setState({ currentIndex: 2 }));
    hook.rerender();
    act(() => hook.result.current.toggleSpeech());
    act(() => fake.start());
    expect(fake.spoken[0].voice?.voiceURI).toBe('lesya');
    expect(fake.spoken[1].voice?.voiceURI).toBe('daniel');
  });
});
