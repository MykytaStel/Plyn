import Dexie, { type EntityTable } from 'dexie';
import type { PlynDocument } from '../../core/models/types';
import { deriveTitle } from '../../core/parsers/markdown';

class PlynDatabase extends Dexie {
  documents!: EntityTable<PlynDocument, 'id'>;

  constructor() {
    super('plyn_library_v2');
    this.version(1).stores({
      documents: 'id, updatedAt, createdAt'
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

export async function removeDocument(id: string): Promise<void> {
  await db.documents.delete(id);
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
