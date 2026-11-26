import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlynDocument, ThoughtNote, UserProgressStats, UserSettings } from '../../core/models/types';
import { importLibraryBackup } from './backup';
import { db, getProgressStats } from './db';

/**
 * L5 compatibility: every backup any Plyn version ever wrote must restore
 * fully into an empty library (invariant 5). New schema → add a fixture in
 * spec/backups/, never edit an old one.
 */
interface Fixture {
  schemaVersion: number;
  documents: PlynDocument[];
  stats: UserProgressStats | null;
  thoughts?: ThoughtNote[];
  settings?: UserSettings;
}

const fixtures = import.meta.glob<Fixture>('../../../spec/backups/*.json', {
  eager: true,
  import: 'default'
});
const entries = Object.entries(fixtures).map(
  ([path, data]) => [path.split('/').pop()!, data] as const
);

beforeEach(async () => {
  await db.delete();
  await db.open();
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('backup fixtures (spec/backups)', () => {
  it('has a fixture for every schema version', () => {
    const names = entries.map(([name]) => name);
    expect(names.some((n) => n.startsWith('v1-'))).toBe(true);
    expect(names.some((n) => n.startsWith('v2-'))).toBe(true);
  });

  it.each(entries)('%s restores fully into an empty library', async (_name, fixture) => {
    const result = await importLibraryBackup(structuredClone(fixture));

    expect(result.importedDocs).toBe(fixture.documents.length);
    for (const doc of fixture.documents) {
      const restored = await db.documents.get(doc.id);
      expect(restored).toEqual(doc);
      // The saved place and bookmarks still point into the same text.
      expect(restored!.charOffset).toBeLessThanOrEqual(restored!.text.length);
      for (const offset of restored!.bookmarkOffsets) {
        expect(offset).toBeLessThan(restored!.text.length);
      }
    }

    expect(result.importedThoughts).toBe(fixture.thoughts?.length ?? 0);
    for (const note of fixture.thoughts ?? []) {
      expect(await db.thoughts.get(note.id)).toEqual(note);
    }

    if (fixture.stats) {
      const stats = await getProgressStats();
      expect(stats.totalCardsRead).toBe(fixture.stats.totalCardsRead);
      expect(stats.totalDocsCompleted).toBe(fixture.stats.totalDocsCompleted);
      expect(stats.unlockedIds).toEqual(expect.arrayContaining(fixture.stats.unlockedIds));
    }

    expect(result.appliedSettings).toEqual(fixture.settings ?? null);
  });
});
