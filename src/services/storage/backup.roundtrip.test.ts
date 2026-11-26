import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlynDocument } from '../../core/models/types';
import { exportLibraryBackup, importLibraryBackup } from './backup';
import { createDocument, db, getProgressStats, recordProgressDelta, updateDocument } from './db';

async function resetDb() {
  await db.delete();
  await db.open();
}

beforeEach(resetDb);

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
    expect(backup.schemaVersion).toBe(1);

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

    await db.documents.put(newer);
    const skipped = await importLibraryBackup({ schemaVersion: 1, documents: [older], stats: null });
    expect(skipped.importedDocs).toBe(0);
    expect((await db.documents.get(doc.id))?.charOffset).toBe(9);

    await db.documents.put(older);
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
});
