import { PlynError } from '../../core/errors';
import type {
  PlynBackupPayload,
  PlynDocument,
  ThoughtNote,
  UserSettings
} from '../../core/models/types';
import {
  db,
  getProgressStats,
  loadAllDocuments,
  putDocument,
  sanitizeChapters
} from './db';
import {
  hasStoredSettings,
  loadUserSettings,
  parseSettings,
  saveUserSettings
} from './settingsStorage';

export const BACKUP_SCHEMA_VERSION = 2;

/**
 * Експортує всю бібліотеку, закладки, прогрес, нотатки й налаштування в JSON
 * для перенесення між пристроями (schemaVersion 2).
 */
export async function exportLibraryBackup(): Promise<PlynBackupPayload> {
  const [documents, stats, thoughts] = await Promise.all([
    // Backups keep the text inline, as before 0.25 (invariant 5).
    loadAllDocuments(),
    getProgressStats(),
    db.thoughts.toArray()
  ]);

  return {
    schemaVersion: 2,
    exportedAt: Date.now(),
    documents,
    stats,
    thoughts,
    settings: loadUserSettings()
  };
}

/**
 * Checks a parsed backup file and brings it to the current shape.
 * v1 files (up to 0.20) get no thoughts and no settings.
 */
export function validateBackupPayload(raw: unknown): PlynBackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new PlynError('backup_invalid');
  }
  const obj = raw as Record<string, unknown>;
  const version = obj.schemaVersion;
  if ((version !== 1 && version !== 2) || !Array.isArray(obj.documents)) {
    throw new PlynError('backup_unsupported');
  }

  const validDocs: PlynDocument[] = (obj.documents as unknown[])
    .filter((d): d is PlynDocument => {
      const doc = d as Partial<PlynDocument> | null;
      return Boolean(doc && typeof doc.id === 'string' && typeof doc.text === 'string');
    })
    .map((doc) => {
      // A table of contents (0.23) is kept only if it still fits the text.
      if (doc.chapters === undefined) return doc;
      const { chapters, ...rest } = doc;
      const clean = sanitizeChapters(chapters, doc.text.length);
      return clean ? { ...rest, chapters: clean } : rest;
    });

  const thoughts: ThoughtNote[] =
    version === 2 && Array.isArray(obj.thoughts)
      ? (obj.thoughts as unknown[]).filter((n): n is ThoughtNote => {
          const note = n as Partial<ThoughtNote> | null;
          return Boolean(
            note &&
              typeof note.id === 'string' &&
              typeof note.text === 'string' &&
              note.text.trim() &&
              typeof note.createdAt === 'number'
          );
        })
      : [];

  return {
    schemaVersion: 2,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    documents: validDocs,
    stats: (obj.stats as PlynBackupPayload['stats']) ?? null,
    thoughts,
    settings: version === 2 ? parseSettings(obj.settings) : null
  };
}

export interface BackupImportResult {
  importedDocs: number;
  importedThoughts: number;
  /** Settings written to this device, or null if it kept its own. */
  appliedSettings: UserSettings | null;
}

/**
 * Імпортує документи з JSON-бекапу (оновлює, якщо в бекапі новіша версія, не видаляє існуючі).
 */
export async function importLibraryBackup(raw: unknown): Promise<BackupImportResult> {
  const payload = validateBackupPayload(raw);

  let importedDocs = 0;
  for (const doc of payload.documents) {
    const existing = await db.documents.get(doc.id);
    if (!existing || (doc.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      await putDocument(doc);
      importedDocs += 1;
    }
  }

  // Thoughts: add the ones this device doesn't have; never overwrite or delete.
  let importedThoughts = 0;
  for (const note of payload.thoughts) {
    if (!(await db.thoughts.get(note.id))) {
      await db.thoughts.put(note);
      importedThoughts += 1;
    }
  }

  // Settings only on a device without its own (restore after a wipe).
  let appliedSettings: UserSettings | null = null;
  if (payload.settings && !hasStoredSettings()) {
    saveUserSettings(payload.settings);
    appliedSettings = payload.settings;
  }

  if (payload.stats) {
    const current = await getProgressStats();
    const mergedUnlocked = Array.from(
      new Set([...current.unlockedIds, ...(payload.stats.unlockedIds || [])])
    );
    await db.stats.put({
      ...current,
      totalCardsRead: Math.max(
        current.totalCardsRead,
        payload.stats.totalCardsRead || 0
      ),
      totalDocsCompleted: Math.max(
        current.totalDocsCompleted,
        payload.stats.totalDocsCompleted || 0
      ),
      anchorCardsRead: Math.max(
        current.anchorCardsRead,
        payload.stats.anchorCardsRead || 0
      ),
      totalBookmarksCreated: Math.max(
        current.totalBookmarksCreated,
        payload.stats.totalBookmarksCreated || 0
      ),
      timerSessionsCompleted: Math.max(
        current.timerSessionsCompleted,
        payload.stats.timerSessionsCompleted || 0
      ),
      ttsCardsListened: Math.max(
        current.ttsCardsListened ?? 0,
        payload.stats.ttsCardsListened ?? 0
      ),
      zenModeUsed: Math.max(
        current.zenModeUsed ?? 0,
        payload.stats.zenModeUsed ?? 0
      ),
      unlockedIds: mergedUnlocked,
      unlockedAt: {
        ...payload.stats.unlockedAt,
        ...current.unlockedAt
      },
      updatedAt: Date.now()
    });
  }

  return { importedDocs, importedThoughts, appliedSettings };
}
