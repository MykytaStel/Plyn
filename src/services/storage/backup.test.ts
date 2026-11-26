import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PlynError } from '../../core/errors';
import { validateBackupPayload } from './backup';

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
