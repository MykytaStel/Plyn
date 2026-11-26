import { PlynError } from '../../core/errors';
import type { PlynBackupPayload, PlynDocument } from '../../core/models/types';
import { db, getProgressStats } from './db';

/**
 * Експортує всю бібліотеку, закладки та прогрес у JSON-об'єкт для перенесення між Mac і iPhone.
 */
export async function exportLibraryBackup(): Promise<PlynBackupPayload> {
  const [documents, stats] = await Promise.all([
    db.documents.toArray(),
    getProgressStats()
  ]);

  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    documents,
    stats
  };
}

export function validateBackupPayload(raw: unknown): PlynBackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new PlynError('backup_invalid');
  }
  const obj = raw as Partial<PlynBackupPayload>;
  if (obj.schemaVersion !== 1 || !Array.isArray(obj.documents)) {
    throw new PlynError('backup_unsupported');
  }

  const validDocs: PlynDocument[] = obj.documents.filter(
    (d): d is PlynDocument =>
      Boolean(d && typeof d.id === 'string' && typeof d.text === 'string')
  );

  return {
    schemaVersion: 1,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    documents: validDocs,
    stats: obj.stats ?? null
  };
}

/**
 * Імпортує документи з JSON-бекапу (оновлює, якщо в бекапі новіша версія, не видаляє існуючі).
 */
export async function importLibraryBackup(
  raw: unknown
): Promise<{ importedDocs: number }> {
  const payload = validateBackupPayload(raw);

  let importedDocs = 0;
  for (const doc of payload.documents) {
    const existing = await db.documents.get(doc.id);
    if (!existing || (doc.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      await db.documents.put(doc);
      importedDocs += 1;
    }
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

  return { importedDocs };
}
