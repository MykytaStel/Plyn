import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  db,
  findDocumentByText,
  getProgressStats,
  loadAllDocuments,
  loadDocument,
  migrateLegacyLocalSession,
  recordProgressDelta,
  removeDocument,
  renameDocument,
  restoreDocument,
  sanitizeChapters,
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
    expect(await loadDocument(doc.id)).toEqual(doc);
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

  it('removes a document and its text, and returns it whole for Undo', async () => {
    const doc = await createDocument({ text: 'abc', totalCards: 1, fallbackTitle: 'x' });
    const removed = await removeDocument(doc.id);
    expect(removed).toEqual(doc);
    expect(await db.documents.get(doc.id)).toBeUndefined();
    expect(await db.texts.get(doc.id)).toBeUndefined();

    await restoreDocument(removed!);
    expect(await loadDocument(doc.id)).toEqual(doc);
  });

  it('keeps the text out of the library rows (0.25)', async () => {
    const doc = await createDocument({ text: 'Два слова.', totalCards: 1, fallbackTitle: 'x' });
    const row = await db.documents.get(doc.id);
    expect(row).not.toHaveProperty('text');
    expect(row).toMatchObject({ textLength: 10, wordCount: 2 });
    expect((await db.texts.get(doc.id))?.text).toBe('Два слова.');
  });

  it('saves progress without touching the text or its hash', async () => {
    const doc = await createDocument({ text: 'Some text.', totalCards: 3, fallbackTitle: 'x' });
    const before = await db.documents.get(doc.id);
    await updateDocument({ ...doc, charOffset: 5, currentIndex: 2 });

    const after = await db.documents.get(doc.id);
    expect(after).toMatchObject({ charOffset: 5, currentIndex: 2, textHash: before!.textHash });
    expect((await loadDocument(doc.id))?.text).toBe('Some text.');
  });

  it('confirms a duplicate by the text, not only by the hash', async () => {
    const doc = await createDocument({ text: 'Same text', totalCards: 1, fallbackTitle: 'x' });
    // Simulate a hash collision: another text under the same hash.
    await db.texts.put({ id: doc.id, text: 'Different text' });
    expect(await findDocumentByText('Same text')).toBeUndefined();
  });

  it('finds an existing document by its exact text', async () => {
    const doc = await createDocument({ text: 'Same text', totalCards: 1, fallbackTitle: 'x' });
    await createDocument({ text: 'Other text', totalCards: 1, fallbackTitle: 'x' });

    expect((await findDocumentByText('Same text'))?.id).toBe(doc.id);
    expect(await findDocumentByText('Same text ')).toBeUndefined();
  });

  it('keeps a book author and table of contents (0.23)', async () => {
    const doc = await createDocument({
      text: 'One\n\nAlpha.\n\nTwo\n\nBeta.',
      totalCards: 2,
      fallbackTitle: 'x',
      author: '  Ada Example ',
      chapters: [
        { title: 'Two', offset: 14, level: 0 },
        { title: 'One', offset: 0, level: 0 }
      ]
    });
    const stored = await db.documents.get(doc.id);
    expect(stored?.author).toBe('Ada Example');
    expect(stored?.chapters?.map((c) => c.title)).toEqual(['One', 'Two']);
  });

  it('stores no author or chapters for plain text', async () => {
    const doc = await createDocument({ text: 'abc', totalCards: 1, fallbackTitle: 'x' });
    const stored = await db.documents.get(doc.id);
    expect(stored && 'author' in stored).toBe(false);
    expect(stored && 'chapters' in stored).toBe(false);
  });
});

describe('sanitizeChapters', () => {
  it('drops entries outside the text, without a title, or malformed', () => {
    const result = sanitizeChapters(
      [
        { title: 'A', offset: 0, level: 0 },
        { title: ' ', offset: 2, level: 0 },
        { title: 'Past the end', offset: 50, level: 0 },
        { title: 'Half', offset: 1.5, level: 0 },
        null,
        'nope',
        { title: 'B', offset: 5, level: -3 }
      ],
      10
    );
    expect(result).toEqual([
      { title: 'A', offset: 0, level: 0 },
      { title: 'B', offset: 5, level: 0 }
    ]);
  });

  it('returns nothing for fewer than two entries or a non-array', () => {
    expect(sanitizeChapters([{ title: 'A', offset: 0, level: 0 }], 10)).toBeUndefined();
    expect(sanitizeChapters({ title: 'A' }, 10)).toBeUndefined();
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

describe('paceSample', () => {
  it('updates readingPace atomically', async () => {
    await Promise.all([
      recordProgressDelta({ paceSample: { words: 30, ms: 10_000 } }),
      recordProgressDelta({ paceSample: { words: 30, ms: 10_000 } })
    ]);
    const stats = await getProgressStats();
    expect(stats.readingPace?.samples).toBe(2);
  });

  it('keeps the pace when a sample is unusable', async () => {
    await recordProgressDelta({ paceSample: { words: 30, ms: 10_000 } });
    await recordProgressDelta({ paceSample: { words: 30, ms: 100 } });
    expect((await getProgressStats()).readingPace?.samples).toBe(1);
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

    const docs = await loadAllDocuments();
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
