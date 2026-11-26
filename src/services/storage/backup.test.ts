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
