/**
 * Asks the browser to keep Plyn's storage (IndexedDB, localStorage) instead of
 * evicting it when space runs low (EXP-07, 0.21 design).
 */

export interface StorageStatus {
  /** The browser has the StorageManager API. */
  supported: boolean;
  /** The browser promised not to evict Plyn's data. */
  persisted: boolean;
  /** Bytes Plyn uses on this device, offline app copy included; null if unknown. */
  usageBytes: number | null;
}

function storageManager(): StorageManager | null {
  return typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const sm = storageManager();
  if (!sm) return { supported: false, persisted: false, usageBytes: null };
  const [persisted, estimate] = await Promise.all([
    typeof sm.persisted === 'function' ? sm.persisted().catch(() => false) : false,
    typeof sm.estimate === 'function' ? sm.estimate().catch(() => null) : null
  ]);
  return {
    supported: typeof sm.persist === 'function',
    persisted,
    usageBytes: typeof estimate?.usage === 'number' ? estimate.usage : null
  };
}

/** Asks for persistent storage. May show a browser prompt (Firefox): call from a tap. */
export async function requestPersistence(): Promise<boolean> {
  const sm = storageManager();
  if (!sm || typeof sm.persist !== 'function') return false;
  try {
    return await sm.persist();
  } catch {
    return false;
  }
}

/**
 * Chromium and Safari answer `persist()` silently; Firefox shows a permission
 * prompt, which must never appear on its own on the main screens.
 */
export function asksSilently(userAgent: string): boolean {
  return !/\bFirefox\//.test(userAgent);
}

/** Protects the library without any prompt, where the browser allows that. */
export async function protectLibraryQuietly(): Promise<void> {
  const sm = storageManager();
  if (!sm || typeof sm.persist !== 'function') return;
  if (!asksSilently(navigator.userAgent)) return;
  try {
    if (await sm.persisted()) return;
    await sm.persist();
  } catch {
    // Not critical: Settings shows the state and offers a backup.
  }
}
