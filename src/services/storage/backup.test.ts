import 'fake-indexeddb/auto';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlynError } from '../../core/errors';
import type { UserProgressStats } from '../../core/models/types';
import fixture027 from '../../../spec/backups/v2-0.27.json';
import fixture026 from '../../../spec/backups/v2-0.26.json';
import { importLibraryBackup, validateBackupPayload } from './backup';
import { db, getProgressStats } from './db';

describe('backup validation', () => {
  it('accepts valid schemaVersion 1 backup payload', () => {
    const payload = validateBackupPayload({
      schemaVersion: 1,
      exportedAt: 12345,
      documents: [
        {
          id: 'doc-1',
          schemaVersion: 1,
          title: 'Тест',
          text: 'Привіт світ',
          charOffset: 0,
          currentIndex: 0,
          totalCards: 1,
          bookmarkOffsets: [],
          createdAt: 100,
          updatedAt: 200
        }
      ],
      stats: null
    });

    expect(payload.documents).toHaveLength(1);
    expect(payload.documents[0].title).toBe('Тест');
  });

  it('keeps a table of contents that fits the text and drops one that does not (0.23)', () => {
    const doc = (id: string, chapters: unknown) => ({
      id,
      schemaVersion: 1,
      title: id,
      text: 'One\n\nTwo',
      charOffset: 0,
      currentIndex: 0,
      totalCards: 1,
      bookmarkOffsets: [],
      chapters,
      createdAt: 1,
      updatedAt: 1
    });
    const payload = validateBackupPayload({
      schemaVersion: 2,
      documents: [
        doc('fits', [
          { title: 'One', offset: 0, level: 0 },
          { title: 'Two', offset: 5, level: 0 }
        ]),
        doc('broken', [{ title: 'Two', offset: 99, level: 0 }, 'x'])
      ],
      stats: null
    });
    expect(payload.documents[0].chapters).toHaveLength(2);
    expect('chapters' in payload.documents[1]).toBe(false);
  });

  it('rejects invalid backup objects', () => {
    expect(() => validateBackupPayload({ foo: 'bar' })).toThrow(PlynError);
    try {
      validateBackupPayload({ foo: 'bar' });
    } catch (err) {
      expect((err as PlynError).code).toBe('backup_unsupported');
    }
    try {
      validateBackupPayload(null);
    } catch (err) {
      expect((err as PlynError).code).toBe('backup_invalid');
    }
  });
});

describe('backup validation (property)', () => {
  it('backup validation returns a valid payload or throws PlynError, nothing else', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.anything(),
          fc.record({ schemaVersion: fc.constant(1), documents: fc.array(fc.anything()) }),
          fc.record({
            schemaVersion: fc.constant(2),
            documents: fc.array(fc.anything()),
            thoughts: fc.oneof(fc.anything(), fc.array(fc.anything())),
            settings: fc.anything()
          })
        ),
        (raw) => {
        try {
          const payload = validateBackupPayload(raw);
          expect(payload.schemaVersion).toBe(2);
          for (const doc of payload.documents) {
            expect(typeof doc.id).toBe('string');
            expect(typeof doc.text).toBe('string');
          }
          for (const note of payload.thoughts) {
            expect(typeof note.id).toBe('string');
            expect(typeof note.text).toBe('string');
          }
          if (payload.settings) expect(['dark', 'paper', 'gray', 'mint']).toContain(payload.settings.theme);
        } catch (err) {
          expect(err).toBeInstanceOf(PlynError);
        }
        }
      ),
      { seed: 1900, numRuns: 300 }
    );
  });
});

describe('backup reading pace (0.27)', () => {
  let store: Map<string, string>;
  beforeEach(async () => {
    await db.delete();
    await db.open();
    store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k)
      }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function seedPace(pace: { wordsPerMinute: number; samples: number }) {
    const current = await getProgressStats();
    await db.stats.put({ ...current, readingPace: pace });
  }

  function withPace(pace: { wordsPerMinute: number; samples: number }) {
    return {
      ...structuredClone(fixture027),
      stats: { ...(fixture027.stats as unknown as UserProgressStats), readingPace: pace }
    };
  }

  it('imports v2-0.27 fixture', async () => {
    const result = await importLibraryBackup(structuredClone(fixture027));
    expect((await getProgressStats()).readingPace).toEqual({ wordsPerMinute: 210, samples: 40 });
    expect(result.appliedSettings?.syllableHints).toBe(true);
    expect(result.appliedSettings?.showTimeLeft).toBe(false);
  });

  it('keeps the pace with more samples', async () => {
    await seedPace({ wordsPerMinute: 150, samples: 60 });
    await importLibraryBackup(withPace({ wordsPerMinute: 210, samples: 40 }));
    expect((await getProgressStats()).readingPace).toEqual({ wordsPerMinute: 150, samples: 60 });

    await seedPace({ wordsPerMinute: 210, samples: 40 });
    await importLibraryBackup(withPace({ wordsPerMinute: 150, samples: 60 }));
    expect((await getProgressStats()).readingPace).toEqual({ wordsPerMinute: 150, samples: 60 });
  });

  it('the 0.26 fixture (no stats) leaves local pace untouched', async () => {
    await seedPace({ wordsPerMinute: 180, samples: 12 });
    expect(fixture026.stats).toBeNull();
    await importLibraryBackup(structuredClone(fixture026));
    expect((await getProgressStats()).readingPace).toEqual({ wordsPerMinute: 180, samples: 12 });
  });

  it('0.26-shaped stats (no readingPace key) leave local pace untouched', async () => {
    await seedPace({ wordsPerMinute: 180, samples: 12 });
    // Stats as 0.26 wrote them: every field but the pace, which arrived in 0.27.
    const stats026: UserProgressStats = structuredClone(fixture027.stats as unknown as UserProgressStats);
    delete stats026.readingPace;
    expect('readingPace' in stats026).toBe(false);
    await importLibraryBackup({ ...structuredClone(fixture026), stats: stats026 });
    const local = await getProgressStats();
    expect(local.readingPace).toEqual({ wordsPerMinute: 180, samples: 12 });
    expect(local.totalCardsRead).toBeGreaterThanOrEqual(stats026.totalCardsRead);
  });
});
