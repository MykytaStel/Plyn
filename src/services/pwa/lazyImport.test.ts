import { describe, expect, it, vi } from 'vitest';
import { PlynError } from '../../core/errors';
import { importWithRetry, isChunkLoadError } from './lazyImport';

const chunkError = () =>
  new TypeError('Failed to fetch dynamically imported module: http://x/assets/pdf-abc.js');

describe('importWithRetry', () => {
  it('returns the module on the first try', async () => {
    const load = vi.fn().mockResolvedValue({ ok: 1 });
    await expect(importWithRetry(load, { retryDelayMs: 0 })).resolves.toEqual({ ok: 1 });
    expect(load).toHaveBeenCalledOnce();
  });

  it('tries a failed chunk once more', async () => {
    const load = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValue({ ok: 2 });
    await expect(importWithRetry(load, { retryDelayMs: 0 })).resolves.toEqual({ ok: 2 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a chunk that is gone becomes app_updated', async () => {
    const load = vi.fn().mockRejectedValue(chunkError());
    const err = await importWithRetry(load, { retryDelayMs: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlynError);
    expect((err as PlynError).code).toBe('app_updated');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('other errors pass through without a retry', async () => {
    const load = vi.fn().mockRejectedValue(new Error('pdf is broken'));
    await expect(importWithRetry(load, { retryDelayMs: 0 })).rejects.toThrow('pdf is broken');
    expect(load).toHaveBeenCalledOnce();
  });

  it('knows the chunk errors of all three engines', () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('network'))).toBe(false);
    expect(isChunkLoadError('x')).toBe(false);
  });
});
