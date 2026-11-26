import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_PROGRESS_STATS,
  evaluateAchievements
} from '../../core/achievements/achievements';
import type {
  AchievementDefinition,
  PlynDocument,
  ThoughtNote,
  UserProgressStats
} from '../../core/models/types';
import { deriveTitle } from '../../core/parsers/markdown';
import { currentI18n } from '../../i18n';
import { toLocalDateKey } from '../../core/reading/weeklyActivity';

class PlynDatabase extends Dexie {
  documents!: EntityTable<PlynDocument, 'id'>;
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
  }
}

export const db = new PlynDatabase();

function generateId(prefix = 'doc'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createDocument(input: {
  title?: string;
  text: string;
  totalCards: number;
  /** Localized title for text whose first line is empty. */
  fallbackTitle: string;
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

    const existing = await db.documents.toArray();
    if (!existing.some((d) => d.text === legacy.text)) {
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
