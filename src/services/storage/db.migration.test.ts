import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlynDocument } from '../../core/models/types';
import { textHash } from '../../core/text/textHash';
import { db, findDocumentByText, loadDocument } from './db';

const NAME = 'plyn_library_v2';

function legacyDoc(id: string, text: string, extra: Partial<PlynDocument> = {}): PlynDocument {
  return {
    id,
    schemaVersion: 1,
    title: `Title ${id}`,
    text,
    charOffset: 3,
    currentIndex: 1,
    totalCards: 4,
    bookmarkOffsets: [5],
    bookmarkNotes: { '5': 'note' },
    completedOnce: false,
    createdAt: 1,
    updatedAt: 2,
    ...extra
  };
}

/** Writes rows with an old schema, the way an earlier release left them. */
async function seedOldVersion(version: 1 | 3, docs: PlynDocument[]): Promise<void> {
  db.close();
  await Dexie.delete(NAME);
  const old = new Dexie(NAME);
  old.version(1).stores({ documents: 'id, updatedAt, createdAt' });
  if (version === 3) {
    old.version(2).stores({ documents: 'id, updatedAt, createdAt', stats: 'id' });
    old.version(3).stores({
      documents: 'id, updatedAt, createdAt',
      stats: 'id',
      thoughts: 'id, createdAt'
    });
  }
  await old.open();
  await old.table('documents').bulkPut(docs);
  if (version === 3) {
    await old.table('thoughts').put({ id: 't1', text: 'Подумати', createdAt: 1 });
    await old.table('stats').put({ id: 'main', totalCardsRead: 7 });
  }
  old.close();
  await db.open();
}

beforeEach(async () => {
  db.close();
  await Dexie.delete(NAME);
});

describe.each([1, 3] as const)('upgrade from version %i to 4 (IMP-06)', (version) => {
  const book = legacyDoc('a', 'Перший абзац тихої книжки.\nДругий абзац.', {
    author: 'Автор',
    chapters: [
      { title: 'Один', offset: 0, level: 0 },
      { title: 'Два', offset: 27, level: 0 }
    ]
  });
  const note = legacyDoc('b', 'Short note.');

  it('moves every text into the texts table and keeps each document whole', async () => {
    await seedOldVersion(version, [book, note]);

    expect(db.verno).toBe(4);
    expect(await loadDocument('a')).toEqual(book);
    expect(await loadDocument('b')).toEqual(note);
    expect(await db.texts.count()).toBe(2);
  });

  it('leaves light rows in documents, with hash, length and word count', async () => {
    await seedOldVersion(version, [book]);

    const row = await db.documents.get('a');
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('text');
    expect(row!.textHash).toBe(textHash(book.text));
    expect(row!.textLength).toBe(book.text.length);
    expect(row!.wordCount).toBe(6);
    expect(row!.charOffset).toBe(3);
    expect(row!.bookmarkOffsets).toEqual([5]);
  });

  it('finds a migrated text as a duplicate', async () => {
    await seedOldVersion(version, [book, note]);
    expect((await findDocumentByText(note.text))?.id).toBe('b');
  });
});

it('keeps thoughts and stats through the upgrade from version 3', async () => {
  await seedOldVersion(3, [legacyDoc('a', 'Text.')]);
  expect(await db.thoughts.get('t1')).toMatchObject({ text: 'Подумати' });
  expect(await db.stats.get('main')).toMatchObject({ totalCardsRead: 7 });
});

it('upgrades an empty library', async () => {
  await seedOldVersion(3, []);
  expect(db.verno).toBe(4);
  expect(await db.documents.count()).toBe(0);
});
