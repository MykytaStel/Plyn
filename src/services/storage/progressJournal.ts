import { db } from './db';

/**
 * A one-entry, synchronous journal of the reading place.
 *
 * Progress goes to IndexedDB with a short debounce. A write started while the
 * page is being closed or reloaded is often lost, so every card change is also
 * written here (localStorage is synchronous). On the next start the entry is
 * applied if IndexedDB is older. Offsets only, never text (invariant 1).
 */
const JOURNAL_KEY = 'plyn_progress_journal_v1';

export interface ProgressJournalEntry {
  id: string;
  charOffset: number;
  currentIndex: number;
  totalCards: number;
  /** Date.now() when the reader reached this card. */
  at: number;
}

function read(): ProgressJournalEntry | null {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressJournalEntry>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.charOffset !== 'number' ||
      typeof parsed.currentIndex !== 'number' ||
      typeof parsed.totalCards !== 'number' ||
      typeof parsed.at !== 'number'
    ) {
      return null;
    }
    return parsed as ProgressJournalEntry;
  } catch {
    return null;
  }
}

function remove(): void {
  try {
    localStorage.removeItem(JOURNAL_KEY);
  } catch {
    // Private mode: nothing was written either.
  }
}

export function writeProgressJournal(entry: ProgressJournalEntry): void {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entry));
  } catch {
    // Private mode or full storage: the debounced IndexedDB write still runs.
  }
}

/** Called after the IndexedDB write for this place has finished. */
export function clearProgressJournal(id: string, at: number): void {
  const entry = read();
  if (entry && entry.id === id && entry.at === at) remove();
}

/** Applies a place that never reached IndexedDB. Returns true if it moved a document. */
export async function applyProgressJournal(): Promise<boolean> {
  const entry = read();
  if (!entry) {
    remove();
    return false;
  }
  try {
    const doc = await db.documents.get(entry.id);
    if (!doc || entry.at <= (doc.updatedAt ?? 0)) return false;
    await db.documents.update(entry.id, {
      charOffset: entry.charOffset,
      currentIndex: entry.currentIndex,
      totalCards: entry.totalCards,
      updatedAt: entry.at
    });
    return true;
  } finally {
    remove();
  }
}
