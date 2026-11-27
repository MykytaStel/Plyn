import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlynDocument } from '../../core/models/types';
import { exportLibraryBackup, importLibraryBackup } from './backup';
import {
  addThoughtNote,
  createDocument,
  db,
  getProgressStats,
  putDocument,
  recordProgressDelta,
  updateDocument
} from './db';
import { DEFAULT_SETTINGS } from './settingsStorage';

async function resetDb() {
  await db.delete();
  await db.open();
}

/** A tiny localStorage for the node project, so settings can be read and written. */
function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  });
  return store;
}

beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

describe('backup export → import', () => {
  it('restores documents, bookmarks, notes and stats into an empty library', async () => {
    const doc = await createDocument({ text: 'One. Two. Three.', totalCards: 2, fallbackTitle: 'x' });
    await updateDocument({
      ...doc,
      charOffset: 5,
      bookmarkOffsets: [5],
      bookmarkNotes: { '5': 'note' }
    });
    await recordProgressDelta({ cardsRead: 7, docsCompleted: 1 });

    const backup = JSON.parse(JSON.stringify(await exportLibraryBackup()));
    expect(backup.schemaVersion).toBe(2);

    await resetDb();
    const result = await importLibraryBackup(backup);

    expect(result.importedDocs).toBe(1);
    const restored = await db.documents.get(doc.id);
    expect(restored?.charOffset).toBe(5);
    expect(restored?.bookmarkOffsets).toEqual([5]);
    expect(restored?.bookmarkNotes).toEqual({ '5': 'note' });

    const stats = await getProgressStats();
    expect(stats.totalCardsRead).toBe(7);
    expect(stats.unlockedIds).toContain('first_step');
  });

  it('never deletes documents that are not in the backup', async () => {
    const backup = await exportLibraryBackup();
    const local = await createDocument({ text: 'Local only', totalCards: 1, fallbackTitle: 'x' });

    await importLibraryBackup(backup);

    expect(await db.documents.get(local.id)).toBeDefined();
  });

  it('keeps the newer copy of a document', async () => {
    const doc = await createDocument({ text: 'Text', totalCards: 1, fallbackTitle: 'x' });
    const older: PlynDocument = { ...doc, charOffset: 1, updatedAt: doc.updatedAt - 1000 };
    const newer: PlynDocument = { ...doc, charOffset: 9, updatedAt: doc.updatedAt + 1000 };

    await putDocument(newer);
    const skipped = await importLibraryBackup({ schemaVersion: 1, documents: [older], stats: null });
    expect(skipped.importedDocs).toBe(0);
    expect((await db.documents.get(doc.id))?.charOffset).toBe(9);

    await putDocument(older);
    const taken = await importLibraryBackup({ schemaVersion: 1, documents: [newer], stats: null });
    expect(taken.importedDocs).toBe(1);
    expect((await db.documents.get(doc.id))?.charOffset).toBe(9);
  });

  it('merges stats by taking the maximum and the union of achievements', async () => {
    await recordProgressDelta({ cardsRead: 10 });
    const local = await getProgressStats();

    await importLibraryBackup({
      schemaVersion: 1,
      documents: [],
      stats: {
        ...local,
        totalCardsRead: 4,
        totalBookmarksCreated: 6,
        unlockedIds: ['zen_reader'],
        unlockedAt: { zen_reader: 1 }
      }
    });

    const merged = await getProgressStats();
    expect(merged.totalCardsRead).toBe(10);
    expect(merged.totalBookmarksCreated).toBe(6);
    expect(merged.unlockedIds).toContain('zen_reader');
  });

  it('skips documents without an id or text', async () => {
    const result = await importLibraryBackup({
      schemaVersion: 1,
      documents: [{ id: 'a' }, { text: 'b' }, null],
      stats: null
    });
    expect(result.importedDocs).toBe(0);
    expect(await db.documents.count()).toBe(0);
  });

  it('restores Thought Parking notes without touching the ones already here (v2)', async () => {
    const note = await addThoughtNote('Buy milk', 'Book');
    const backup = JSON.parse(JSON.stringify(await exportLibraryBackup()));
    expect(backup.thoughts).toHaveLength(1);

    await resetDb();
    const local = await addThoughtNote('Local thought');
    const result = await importLibraryBackup(backup);

    expect(result.importedThoughts).toBe(1);
    expect((await db.thoughts.get(note!.id))?.text).toBe('Buy milk');
    expect(await db.thoughts.get(local!.id)).toBeDefined();

    const again = await importLibraryBackup(backup);
    expect(again.importedThoughts).toBe(0);
    expect(await db.thoughts.count()).toBe(2);
  });

  it('applies backup settings only on a device without its own (v2)', async () => {
    stubLocalStorage({
      plyn_settings_v1: JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'mint', fontSize: 28 })
    });
    const backup = JSON.parse(JSON.stringify(await exportLibraryBackup()));
    expect(backup.settings).toMatchObject({ theme: 'mint', fontSize: 28 });

    // Another device with its own settings keeps them.
    const other = stubLocalStorage({
      plyn_settings_v1: JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'paper' })
    });
    expect((await importLibraryBackup(backup)).appliedSettings).toBeNull();
    expect(JSON.parse(other.get('plyn_settings_v1')!).theme).toBe('paper');

    // A wiped device gets them back.
    const wiped = stubLocalStorage();
    const result = await importLibraryBackup(backup);
    expect(result.appliedSettings).toMatchObject({ theme: 'mint', fontSize: 28 });
    expect(JSON.parse(wiped.get('plyn_settings_v1')!).theme).toBe('mint');
  });

  it('imports a v1 backup with no thoughts and no settings', async () => {
    stubLocalStorage();
    const result = await importLibraryBackup({ schemaVersion: 1, documents: [], stats: null });
    expect(result).toEqual({ importedDocs: 0, importedThoughts: 0, appliedSettings: null });
  });
});
