import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  db,
  findDocumentByText,
  getProgressStats,
  migrateLegacyLocalSession,
  recordProgressDelta,
  removeDocument,
  renameDocument,
  updateDocument
} from './db';
import { toLocalDateKey } from '../../core/reading/weeklyActivity';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('documents', () => {
  it('creates a document at the start of the text', async () => {
    const doc = await createDocument({
      title: '  Kobzar  ',
      text: 'Some text.',
      totalCards: 0,
      fallbackTitle: 'Untitled'
    });

    expect(doc.title).toBe('Kobzar');
    expect(doc.charOffset).toBe(0);
    expect(doc.totalCards).toBe(1);
    expect(doc.bookmarkOffsets).toEqual([]);
    expect(await db.documents.get(doc.id)).toEqual(doc);
  });

  it('derives the title from the first line when none is given', async () => {
    const doc = await createDocument({
      text: 'First line\nSecond line',
      totalCards: 1,
      fallbackTitle: 'Untitled'
    });
    expect(doc.title).toBe('First line');
  });

  it('deduplicates and sorts bookmark offsets on update', async () => {
    const doc = await createDocument({ text: 'abc', totalCards: 1, fallbackTitle: 'x' });
    const updated = await updateDocument({ ...doc, bookmarkOffsets: [30, 10, 30, 20] });

    expect(updated.bookmarkOffsets).toEqual([10, 20, 30]);
    expect((await db.documents.get(doc.id))?.bookmarkOffsets).toEqual([10, 20, 30]);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(doc.updatedAt);
  });

  it('renames with a trimmed title and ignores empty names', async () => {
    const doc = await createDocument({ text: 'abc', totalCards: 1, fallbackTitle: 'x' });

    await renameDocument(doc.id, '  New name ');
    expect((await db.documents.get(doc.id))?.title).toBe('New name');

    await renameDocument(doc.id, '   ');
    expect((await db.documents.get(doc.id))?.title).toBe('New name');
  });

  it('removes a document', async () => {
    const doc = await createDocument({ text: 'abc', totalCards: 1, fallbackTitle: 'x' });
    await removeDocument(doc.id);
    expect(await db.documents.get(doc.id)).toBeUndefined();
  });

  it('finds an existing document by its exact text', async () => {
    const doc = await createDocument({ text: 'Same text', totalCards: 1, fallbackTitle: 'x' });
    await createDocument({ text: 'Other text', totalCards: 1, fallbackTitle: 'x' });

    expect((await findDocumentByText('Same text'))?.id).toBe(doc.id);
    expect(await findDocumentByText('Same text ')).toBeUndefined();
  });
});

describe('recordProgressDelta', () => {
  it('adds deltas to totals and to today', async () => {
    await recordProgressDelta({ cardsRead: 3 });
    await recordProgressDelta({ cardsRead: 2, bookmarksCreated: 1 });

    const stats = await getProgressStats();
    expect(stats.totalCardsRead).toBe(5);
    expect(stats.totalBookmarksCreated).toBe(1);
    expect(stats.dailyCardsRead?.[toLocalDateKey(new Date())]).toBe(5);
  });

  it('unlocks an achievement once', async () => {
    const first = await recordProgressDelta({ docsCompleted: 1 });
    const second = await recordProgressDelta({ docsCompleted: 1 });

    expect(first.map((a) => a.id)).toContain('first_step');
    expect(second.map((a) => a.id)).not.toContain('first_step');
    expect((await getProgressStats()).unlockedIds.filter((id) => id === 'first_step')).toHaveLength(1);
  });

  it('does not lose updates when called concurrently', async () => {
    await Promise.all(Array.from({ length: 20 }, () => recordProgressDelta({ cardsRead: 1 })));

    const stats = await getProgressStats();
    expect(stats.totalCardsRead).toBe(20);
    expect(stats.dailyCardsRead?.[toLocalDateKey(new Date())]).toBe(20);
  });
});

describe('migrateLegacyLocalSession', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k)
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves the pre-Dexie session into the library once and removes it', async () => {
    store.set('plyn_session_v1', JSON.stringify({ text: 'Old text.', totalCards: 2 }));

    await migrateLegacyLocalSession();
    await migrateLegacyLocalSession();

    const docs = await db.documents.toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0].text).toBe('Old text.');
    expect(store.has('plyn_session_v1')).toBe(false);
  });

  it('does not duplicate a text that is already in the library', async () => {
    await createDocument({ text: 'Old text.', totalCards: 1, fallbackTitle: 'x' });
    store.set('plyn_session_v1', JSON.stringify({ text: 'Old text.' }));

    await migrateLegacyLocalSession();

    expect(await db.documents.count()).toBe(1);
    expect(store.has('plyn_session_v1')).toBe(false);
  });
});
