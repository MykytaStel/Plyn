import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addThoughtNote, db } from '../services/storage/db';
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

  it('opens a new book at its first chapter, keeping the title page (0.25)', async () => {
    const imprint = 'ISBN 978-0-00-000000-0. Publisher, 2025.';
    const text = `${imprint}\n\nChapter one\n\nThe story starts here. It goes on.`;
    const chapterOffset = text.indexOf('Chapter one');
    await useReaderStore.getState().startNewDocument('Book', text, 'short', {
      chapters: [
        { title: 'Chapter one', offset: chapterOffset, level: 0 },
        { title: 'Later', offset: text.indexOf('The story'), level: 0 }
      ]
    });

    const state = useReaderStore.getState();
    expect(state.cards[0].text).toContain('ISBN');
    expect(state.cards[state.currentIndex].text).toBe('Chapter one');
    expect(state.activeDoc?.charOffset).toBe(chapterOffset);
    expect((await db.documents.get(state.activeDoc!.id))?.charOffset).toBe(chapterOffset);
  });

  it('starts plain text at the beginning', async () => {
    await useReaderStore.getState().startNewDocument('', 'One. Two.\n\nThree.', 'short');
    expect(useReaderStore.getState().currentIndex).toBe(0);
  });

  it('ignores empty text', async () => {
    await useReaderStore.getState().startNewDocument('', '   ', 'medium');
    expect(await db.documents.count()).toBe(0);
    expect(useReaderStore.getState().activeDoc).toBeNull();
  });
});

describe('openDocument', () => {
  it('loads the text of a library row before splitting (0.25)', async () => {
    await useReaderStore.getState().startNewDocument('', 'First one. Second one.\n\nThird.', 'short');
    const id = useReaderStore.getState().activeDoc!.id;
    useReaderStore.setState({ activeDoc: null, cards: [], currentIndex: 0 });

    const row = (await db.documents.get(id))!;
    expect(row).not.toHaveProperty('text');
    await useReaderStore.getState().openDocument(row, 'short');

    const state = useReaderStore.getState();
    expect(state.activeDoc?.text).toBe('First one. Second one.\n\nThird.');
    expect(state.cards.length).toBeGreaterThan(1);
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

describe('closeReader session thoughts (0.27)', () => {
  const open = () =>
    useReaderStore.getState().startNewDocument('', 'One. Two.\n\nThree.', 'short');

  beforeEach(async () => {
    vi.stubGlobal('window', { clearTimeout, setTimeout });
    await db.thoughts.clear();
    useReaderStore.setState({ lastSessionThoughts: null });
    return () => vi.unstubAllGlobals();
  });

  it('keeps the count of thoughts parked during an early exit', async () => {
    await open();
    await addThoughtNote('buy coffee');
    await useReaderStore.getState().closeReader({ early: true });
    expect(useReaderStore.getState().lastSessionThoughts?.count).toBe(1);
  });

  it('keeps nothing without early, or with no thoughts', async () => {
    await open();
    await addThoughtNote('buy coffee');
    await useReaderStore.getState().closeReader();
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();

    await open();
    await useReaderStore.getState().closeReader({ early: true });
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();
  });

  it('ignores thoughts parked before the session began', async () => {
    await addThoughtNote('old');
    await new Promise((r) => setTimeout(r, 5));
    await open();
    await useReaderStore.getState().closeReader({ early: true });
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();
  });

  it('still closes, with no notice, when counting thoughts fails', async () => {
    await open();
    const spy = vi.spyOn(db.thoughts, 'where').mockImplementation(() => {
      throw new Error('boom');
    });
    await useReaderStore.getState().closeReader({ early: true });
    spy.mockRestore();
    expect(useReaderStore.getState().activeDoc).toBeNull();
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();
  });

  it('consumeLastSessionThoughts clears it', async () => {
    useReaderStore.setState({ lastSessionThoughts: { count: 2, since: 1 } });
    useReaderStore.getState().consumeLastSessionThoughts();
    expect(useReaderStore.getState().lastSessionThoughts).toBeNull();
  });
});
