import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
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
