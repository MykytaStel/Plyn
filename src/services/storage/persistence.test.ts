import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  asksSilently,
  getStorageStatus,
  protectLibraryQuietly,
  requestPersistence
} from './persistence';

function stubStorage(opts: { persisted: boolean; persist?: boolean; usage?: number; ua?: string }) {
  const persist = vi.fn(async () => opts.persist ?? true);
  vi.stubGlobal('navigator', {
    userAgent: opts.ua ?? 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1',
    storage: {
      persisted: async () => opts.persisted,
      persist,
      estimate: async () => ({ usage: opts.usage, quota: 1e9 })
    }
  });
  return persist;
}

afterEach(() => vi.unstubAllGlobals());

const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0';
const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';

describe('storage persistence', () => {
  it('reports status and usage', async () => {
    stubStorage({ persisted: true, usage: 2_500_000 });
    expect(await getStorageStatus()).toEqual({
      supported: true,
      persisted: true,
      usageBytes: 2_500_000
    });
  });

  it('reports unsupported without the StorageManager API', async () => {
    vi.stubGlobal('navigator', { userAgent: CHROME });
    expect(await getStorageStatus()).toEqual({
      supported: false,
      persisted: false,
      usageBytes: null
    });
    expect(await requestPersistence()).toBe(false);
  });

  it('asks quietly on Chromium and Safari, once', async () => {
    const persist = stubStorage({ persisted: false, ua: CHROME });
    await protectLibraryQuietly();
    expect(persist).toHaveBeenCalledOnce();

    const again = stubStorage({ persisted: true, ua: CHROME });
    await protectLibraryQuietly();
    expect(again).not.toHaveBeenCalled();
  });

  it('never asks on its own in Firefox, which would show a prompt', async () => {
    const persist = stubStorage({ persisted: false, ua: FIREFOX });
    await protectLibraryQuietly();
    expect(persist).not.toHaveBeenCalled();
    expect(asksSilently(FIREFOX)).toBe(false);
    expect(asksSilently(CHROME)).toBe(true);
  });

  it('returns the browser answer when the reader asks from Settings', async () => {
    stubStorage({ persisted: false, persist: false, ua: FIREFOX });
    expect(await requestPersistence()).toBe(false);
  });
});
