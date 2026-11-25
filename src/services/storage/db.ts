import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_PROGRESS_STATS,
  evaluateAchievements
} from '../../core/achievements/achievements';
import type {
  AchievementDefinition,
  PlynDocument,
  UserProgressStats
} from '../../core/models/types';
import { deriveTitle } from '../../core/parsers/markdown';

class PlynDatabase extends Dexie {
  documents!: EntityTable<PlynDocument, 'id'>;
  stats!: EntityTable<UserProgressStats, 'id'>;

  constructor() {
    super('plyn_library_v2');
    this.version(1).stores({
      documents: 'id, updatedAt, createdAt'
    });
    this.version(2).stores({
      documents: 'id, updatedAt, createdAt',
      stats: 'id'
    });
  }
}

export const db = new PlynDatabase();

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createDocument(input: {
  title?: string;
  text: string;
  totalCards: number;
}): Promise<PlynDocument> {
  const now = Date.now();
  const doc: PlynDocument = {
    id: generateId(),
    schemaVersion: 1,
    title: input.title?.trim() || deriveTitle(input.text),
    text: input.text,
    charOffset: 0,
    currentIndex: 0,
    totalCards: Math.max(1, input.totalCards),
    bookmarkOffsets: [],
    completedOnce: false,
    createdAt: now,
    updatedAt: now
  };

  await db.documents.put(doc);
  return doc;
}

export async function updateDocument(doc: PlynDocument): Promise<PlynDocument> {
  const updated: PlynDocument = {
    ...doc,
    bookmarkOffsets: [...new Set(doc.bookmarkOffsets)].sort((a, b) => a - b),
    updatedAt: Date.now()
  };
  await db.documents.put(updated);
  return updated;
}

export async function renameDocument(id: string, newTitle: string): Promise<void> {
  const trimmed = newTitle.trim();
  if (!trimmed) return;
  await db.documents.update(id, { title: trimmed, updatedAt: Date.now() });
}

export async function removeDocument(id: string): Promise<void> {
  await db.documents.delete(id);
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
}

/**
 * Атомарно оновлює накопичувальну статистику прогресу і повертає щойно відкриті ачівменти.
 */
export async function recordProgressDelta(
  delta: ProgressDelta
): Promise<AchievementDefinition[]> {
  try {
    const current = await getProgressStats();
    const updated: UserProgressStats = {
      ...current,
      totalCardsRead: current.totalCardsRead + (delta.cardsRead ?? 0),
      anchorCardsRead: current.anchorCardsRead + (delta.anchorCardsRead ?? 0),
      totalDocsCompleted:
        current.totalDocsCompleted + (delta.docsCompleted ?? 0),
      totalBookmarksCreated:
        current.totalBookmarksCreated + (delta.bookmarksCreated ?? 0),
      timerSessionsCompleted:
        current.timerSessionsCompleted + (delta.timerSessionsCompleted ?? 0)
    };

    const { nextStats, newlyUnlocked } = evaluateAchievements(updated);
    await db.stats.put(nextStats);
    return newlyUnlocked;
  } catch {
    return [];
  }
}

/**
 * Одноразова міграція сесії зі старого MVP localStorage у Dexie.
 */
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

    const existing = await db.documents.toArray();
    if (!existing.some((d) => d.text === legacy.text)) {
      await createDocument({
        text: legacy.text,
        totalCards: legacy.totalCards ?? 1
      });
    }
    window.localStorage.removeItem('plyn_session_v1');
  } catch {
    // Ігноруємо у приватному режимі
  }
}
