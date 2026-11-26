import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument, db, updateDocument } from './db';
import {
  applyProgressJournal,
  clearProgressJournal,
  writeProgressJournal
} from './progressJournal';

const KEY = 'plyn_progress_journal_v1';

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
}

beforeEach(async () => {
  vi.unstubAllGlobals();
  vi.stubGlobal('localStorage', fakeLocalStorage());
  await db.delete();
  await db.open();
});

async function newDoc() {
  return createDocument({ title: 'T', text: 'One. Two. Three.', totalCards: 3, fallbackTitle: 'x' });
}

describe('progress journal', () => {
  it('applies a place that never reached IndexedDB (page closed right after a swipe)', async () => {
    const doc = await newDoc();
    writeProgressJournal({ id: doc.id, charOffset: 10, currentIndex: 2, totalCards: 3, at: doc.updatedAt + 1 });

    expect(await applyProgressJournal()).toBe(true);
    const stored = await db.documents.get(doc.id);
    expect(stored?.charOffset).toBe(10);
    expect(stored?.currentIndex).toBe(2);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('never moves a document back to an older place', async () => {
    const doc = await newDoc();
    writeProgressJournal({ id: doc.id, charOffset: 5, currentIndex: 1, totalCards: 3, at: doc.updatedAt - 1 });
    await updateDocument({ ...doc, charOffset: 10, currentIndex: 2 });

    expect(await applyProgressJournal()).toBe(false);
    expect((await db.documents.get(doc.id))?.charOffset).toBe(10);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores a journal for a deleted document and broken JSON', async () => {
    writeProgressJournal({ id: 'gone', charOffset: 1, currentIndex: 0, totalCards: 1, at: Date.now() });
    expect(await applyProgressJournal()).toBe(false);

    localStorage.setItem(KEY, '{not json');
    expect(await applyProgressJournal()).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('clears only the entry that was written to IndexedDB', () => {
    writeProgressJournal({ id: 'a', charOffset: 1, currentIndex: 0, totalCards: 1, at: 100 });
    clearProgressJournal('a', 99);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    clearProgressJournal('a', 100);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does nothing when localStorage is unavailable (private mode)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      }
    });
    expect(() =>
      writeProgressJournal({ id: 'a', charOffset: 1, currentIndex: 0, totalCards: 1, at: 1 })
    ).not.toThrow();
    expect(await applyProgressJournal()).toBe(false);
  });
});
