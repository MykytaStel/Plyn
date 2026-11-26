import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../services/storage/db';
import { useReaderStore } from './useReaderStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useReaderStore.setState({ activeDoc: null, cards: [], currentIndex: 0 });
});

describe('startNewDocument', () => {
  it('reopens the copy already in the library, keeping its progress', async () => {
    const text = 'First sentence here. Second sentence here.\n\nThird paragraph is here.';
    await useReaderStore.getState().startNewDocument('', text, 'short');
    const first = useReaderStore.getState().activeDoc!;

    const lastCard = useReaderStore.getState().cards.at(-1)!;
    await db.documents.update(first.id, { charOffset: lastCard.startOffset });

    await useReaderStore.getState().startNewDocument('', `  ${text}\n`, 'short');

    expect(await db.documents.count()).toBe(1);
    const state = useReaderStore.getState();
    expect(state.activeDoc?.id).toBe(first.id);
    expect(state.currentIndex).toBe(state.cards.length - 1);
  });

  it('ignores empty text', async () => {
    await useReaderStore.getState().startNewDocument('', '   ', 'medium');
    expect(await db.documents.count()).toBe(0);
    expect(useReaderStore.getState().activeDoc).toBeNull();
  });
});

describe('a swipe followed quickly by a bookmark or note', () => {
  const TEXT = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} is here.`).join(' ');
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps a bookmark added within the progress debounce', async () => {
    await useReaderStore.getState().startNewDocument('', TEXT, 'short');
    const { setCurrentIndex, toggleBookmarkAtCurrent } = useReaderStore.getState();

    setCurrentIndex(1, false);
    await toggleBookmarkAtCurrent();
    await wait(400);

    const id = useReaderStore.getState().activeDoc!.id;
    const card = useReaderStore.getState().cards[1];
    const stored = await db.documents.get(id);
    expect(stored?.charOffset).toBe(card.startOffset);
    expect(stored?.bookmarkOffsets).toEqual([card.startOffset]);
  });

  it('keeps a bookmark note saved within the progress debounce', async () => {
    await useReaderStore.getState().startNewDocument('', TEXT, 'short');
    await useReaderStore.getState().toggleBookmarkAtCurrent();
    await wait(400);

    useReaderStore.getState().setCurrentIndex(2, false);
    await useReaderStore.getState().setBookmarkNote(0, 'note');
    await wait(400);

    const stored = await db.documents.get(useReaderStore.getState().activeDoc!.id);
    expect(stored?.bookmarkNotes).toEqual({ '0': 'note' });
    expect(stored?.charOffset).toBe(useReaderStore.getState().cards[2].startOffset);
  });
});
