import { PlynError } from '../../core/errors';

/**
 * The messages engines use when a lazy chunk cannot be loaded (Chromium,
 * WebKit, Firefox). After a deploy, an old page may ask for a chunk that no
 * longer exists on the server.
 */
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

export function isChunkLoadError(err: unknown): boolean {
  return err instanceof Error && CHUNK_ERROR.test(err.message);
}

/**
 * Loads a lazy module (IMP-15). A chunk that fails to load is tried once more
 * after a short pause (a flaky connection); if it still fails, the reader gets
 * `app_updated`: Plyn changed underneath this page and a reload fixes it.
 */
export async function importWithRetry<T>(
  load: () => Promise<T>,
  { retryDelayMs = 400 }: { retryDelayMs?: number } = {}
): Promise<T> {
  try {
    return await load();
  } catch (err) {
    if (!isChunkLoadError(err)) throw err;
  }
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  try {
    return await load();
  } catch (err) {
    if (isChunkLoadError(err)) throw new PlynError('app_updated');
    throw err;
  }
}
