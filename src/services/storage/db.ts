import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_PROGRESS_STATS,
  evaluateAchievements
} from '../../core/achievements/achievements';
import type {
  AchievementDefinition,
  DocumentChapter,
  DocumentMeta,
  PlynDocument,
  StoredText,
  ThoughtNote,
  UserProgressStats
} from '../../core/models/types';
import { countWords } from '../../core/reading/readingStats';
import { textHash } from '../../core/text/textHash';
import { deriveTitle } from '../../core/parsers/markdown';
import { currentI18n } from '../../i18n';
import { toLocalDateKey } from '../../core/reading/weeklyActivity';
import { protectLibraryQuietly } from './persistence';

/** Splits a full document into the light row and its text (0.25, IMP-06). */
export function toDocumentMeta(doc: PlynDocument): DocumentMeta {
  const { text, ...rest } = doc;
  return {
    ...rest,
    textHash: textHash(text),
    textLength: text.length,
    wordCount: countWords(text)
  };
}

/** Joins a light row with its text into the shape the reader and backups use. */
export function toPlynDocument(meta: DocumentMeta, text: string): PlynDocument {
  const rest: Partial<DocumentMeta> = { ...meta };
  delete rest.textHash;
  delete rest.textLength;
  delete rest.wordCount;
  return { ...(rest as Omit<DocumentMeta, 'textHash' | 'textLength' | 'wordCount'>), text };
}

class PlynDatabase extends Dexie {
  /** Light rows for the library list: no text (0.25). */
  documents!: EntityTable<DocumentMeta, 'id'>;
  /** Document texts, keyed by document id (0.25). */
  texts!: EntityTable<StoredText, 'id'>;
  stats!: EntityTable<UserProgressStats, 'id'>;
  thoughts!: EntityTable<ThoughtNote, 'id'>;

  constructor() {
    super('plyn_library_v2');
    this.version(1).stores({
      documents: 'id, updatedAt, createdAt'
    });
    this.version(2).stores({
      documents: 'id, updatedAt, createdAt',
      stats: 'id'
    });
    this.version(3).stores({
      documents: 'id, updatedAt, createdAt',
      stats: 'id',
      thoughts: 'id, createdAt'
    });
    // 0.25 (IMP-06): the text moves to its own table; the library list reads
    // only light rows. Everything runs inside the upgrade transaction, so a
    // failed upgrade leaves version 3 as it was.
    this.version(4)
      .stores({
        documents: 'id, updatedAt, createdAt, textHash',
        stats: 'id',
        thoughts: 'id, createdAt',
        texts: 'id'
      })
      .upgrade(async (tx) => {
        const documents = tx.table('documents');
        const texts = tx.table('texts');
        const rows = (await documents.toArray()) as Array<
          Partial<PlynDocument> & { id: string }
        >;
        for (const row of rows) {
          const text = typeof row.text === 'string' ? row.text : '';
          await texts.put({ id: row.id, text });
          await documents.put(toDocumentMeta({ ...(row as PlynDocument), text }));
        }
      });
  }
}

export const db = new PlynDatabase();

function generateId(prefix = 'doc'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Keeps only well-formed chapters that point inside a text of `textLength`,
 * in reading order. Returns undefined when fewer than two are left.
 */
export function sanitizeChapters(
  chapters: unknown,
  textLength: number
): DocumentChapter[] | undefined {
  if (!Array.isArray(chapters)) return undefined;
  const valid = chapters
    .filter(
      (c): c is DocumentChapter =>
        Boolean(c) &&
        typeof (c as DocumentChapter).title === 'string' &&
        (c as DocumentChapter).title.trim().length > 0 &&
        Number.isInteger((c as DocumentChapter).offset) &&
        (c as DocumentChapter).offset >= 0 &&
        (c as DocumentChapter).offset < textLength
    )
    .map((c) => ({
      title: c.title.trim().slice(0, 300),
      offset: c.offset,
      level: Number.isInteger(c.level) && c.level >= 0 ? Math.min(c.level, 6) : 0
    }))
    .sort((a, b) => a.offset - b.offset);
  return valid.length >= 2 ? valid : undefined;
}

/** The full document (with its text), or undefined. */
export async function loadDocument(id: string): Promise<PlynDocument | undefined> {
  return db.transaction('r', db.documents, db.texts, async () => {
    const [meta, stored] = await Promise.all([db.documents.get(id), db.texts.get(id)]);
    return meta ? toPlynDocument(meta, stored?.text ?? '') : undefined;
  });
}

/** Every document with its text, oldest first (backups). */
export async function loadAllDocuments(): Promise<PlynDocument[]> {
  return db.transaction('r', db.documents, db.texts, async () => {
    const metas = await db.documents.toArray();
    const texts = await db.texts.bulkGet(metas.map((m) => m.id));
    return metas.map((meta, i) => toPlynDocument(meta, texts[i]?.text ?? ''));
  });
}

/** Writes a whole document: its light row and its text, together. */
export async function putDocument(doc: PlynDocument): Promise<void> {
  await db.transaction('rw', db.documents, db.texts, async () => {
    await db.texts.put({ id: doc.id, text: doc.text });
    await db.documents.put(toDocumentMeta(doc));
  });
}

/**
 * A library document whose text is exactly `text`, if any. Candidates come
 * from the hash index; the text comparison makes a collision harmless.
 */
export async function findDocumentByText(text: string): Promise<PlynDocument | undefined> {
  const candidates = await db.documents.where('textHash').equals(textHash(text)).toArray();
  for (const meta of candidates) {
    const stored = await db.texts.get(meta.id);
    if (stored?.text === text) return toPlynDocument(meta, stored.text);
  }
  return undefined;
}

export async function createDocument(input: {
  title?: string;
  text: string;
  totalCards: number;
  /** Localized title for text whose first line is empty. */
  fallbackTitle: string;
  /** From a book's metadata (0.23). */
  author?: string;
  /** A book's table of contents; offsets into `text` (0.23). */
  chapters?: DocumentChapter[];
}): Promise<PlynDocument> {
  const now = Date.now();
  const doc: PlynDocument = {
    id: generateId('doc'),
    schemaVersion: 1,
    title: input.title?.trim() || deriveTitle(input.text, input.fallbackTitle),
    text: input.text,
    charOffset: 0,
    currentIndex: 0,
    totalCards: Math.max(1, input.totalCards),
    bookmarkOffsets: [],
    bookmarkNotes: {},
    completedOnce: false,
    createdAt: now,
    updatedAt: now
  };
  const author = input.author?.trim();
  if (author) doc.author = author;
  const chapters = sanitizeChapters(input.chapters, input.text.length);
  if (chapters) doc.chapters = chapters;

  await putDocument(doc);
  // The library now has something worth keeping.
  void protectLibraryQuietly();
  return doc;
}

/**
 * Saves progress, bookmarks and the like. The text never changes after
 * import, so only the light row is written (no re-hashing a whole book).
 */
export async function updateDocument(doc: PlynDocument): Promise<PlynDocument> {
  const updated: PlynDocument = {
    ...doc,
    bookmarkOffsets: [...new Set(doc.bookmarkOffsets)].sort((a, b) => a - b),
    updatedAt: Date.now()
  };
  await db.transaction('rw', db.documents, db.texts, async () => {
    const existing = await db.documents.get(doc.id);
    if (!existing) {
      await putDocument(updated);
      return;
    }
    const rest: Partial<PlynDocument> = { ...updated };
    delete rest.text;
    await db.documents.put({
      ...(rest as Omit<PlynDocument, 'text'>),
      textHash: existing.textHash,
      textLength: existing.textLength,
      wordCount: existing.wordCount
    });
  });
  return updated;
}

export async function renameDocument(id: string, newTitle: string): Promise<void> {
  const trimmed = newTitle.trim();
  if (!trimmed) return;
  await db.documents.update(id, { title: trimmed, updatedAt: Date.now() });
}

/** Deletes a document and its text; returns it whole, for Undo. */
export async function removeDocument(id: string): Promise<PlynDocument | undefined> {
  return db.transaction('rw', db.documents, db.texts, async () => {
    const doc = await loadDocument(id);
    await db.documents.delete(id);
    await db.texts.delete(id);
    return doc;
  });
}

/** Puts a just-deleted document back exactly as it was (Undo). */
export async function restoreDocument(doc: PlynDocument): Promise<void> {
  await putDocument(doc);
}

/**
 * «Парковка думок» для РДУГ — збереження сторонньої думки без виходу з читання.
 */
export async function addThoughtNote(
  text: string,
  docTitle?: string
): Promise<ThoughtNote | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const note: ThoughtNote = {
    id: generateId('thought'),
    text: trimmed,
    docTitle,
    createdAt: Date.now()
  };
  await db.thoughts.put(note);
  return note;
}

export async function removeThoughtNote(id: string): Promise<void> {
  await db.thoughts.delete(id);
}

export async function getProgressStats(): Promise<UserProgressStats> {
  const existing = await db.stats.get('main');
  return existing ?? { ...DEFAULT_PROGRESS_STATS };
}

export interface ProgressDelta {
  cardsRead?: number;
  anchorCardsRead?: number;
  docsCompleted?: number;
  bookmarksCreated?: number;
  timerSessionsCompleted?: number;
  ttsCardsListened?: number;
  zenModeUsed?: number;
}

/**
 * Атомарно оновлює накопичувальну статистику прогресу (вкл. 7-денний ритм)
 * і повертає щойно відкриті ачівменти.
 */
export async function recordProgressDelta(
  delta: ProgressDelta
): Promise<AchievementDefinition[]> {
  try {
    // Read-modify-write inside one transaction, so close calls (fast swipes
    // plus a TTS event) are serialized and no delta is lost.
    return await db.transaction('rw', db.stats, async () => {
      const current = await getProgressStats();
      const dailyCardsRead = { ...(current.dailyCardsRead || {}) };

      if (delta.cardsRead && delta.cardsRead > 0) {
        const todayKey = toLocalDateKey(new Date());
        dailyCardsRead[todayKey] = (dailyCardsRead[todayKey] || 0) + delta.cardsRead;
      }

      const updated: UserProgressStats = {
        ...current,
        totalCardsRead: current.totalCardsRead + (delta.cardsRead ?? 0),
        anchorCardsRead: current.anchorCardsRead + (delta.anchorCardsRead ?? 0),
        totalDocsCompleted:
          current.totalDocsCompleted + (delta.docsCompleted ?? 0),
        totalBookmarksCreated:
          current.totalBookmarksCreated + (delta.bookmarksCreated ?? 0),
        timerSessionsCompleted:
          current.timerSessionsCompleted + (delta.timerSessionsCompleted ?? 0),
        ttsCardsListened:
          (current.ttsCardsListened ?? 0) + (delta.ttsCardsListened ?? 0),
        zenModeUsed: (current.zenModeUsed ?? 0) + (delta.zenModeUsed ?? 0),
        dailyCardsRead
      };

      const { nextStats, newlyUnlocked } = evaluateAchievements(updated);
      await db.stats.put(nextStats);
      return newlyUnlocked;
    });
  } catch {
    return [];
  }
}

export async function migrateLegacyLocalSession(): Promise<void> {
  try {
    const raw = window.localStorage.getItem('plyn_session_v1');
    if (!raw) return;
    const legacy = JSON.parse(raw) as {
      text?: string;
      currentIndex?: number;
      totalCards?: number;
    };
    if (!legacy.text?.trim()) {
      window.localStorage.removeItem('plyn_session_v1');
      return;
    }

    if (!(await findDocumentByText(legacy.text))) {
      await createDocument({
        text: legacy.text,
        totalCards: legacy.totalCards ?? 1,
        fallbackTitle: currentI18n().m.common.untitled
      });
    }
    window.localStorage.removeItem('plyn_session_v1');
  } catch {
    // Ігноруємо у приватному режимі
  }
}
