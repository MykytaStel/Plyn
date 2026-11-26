import { useSyncExternalStore } from 'react';

/**
 * Service worker updates without interrupting reading (IMP-15, 0.22).
 *
 * The worker is registered in `prompt` mode: a new version installs in the
 * background and waits. It takes over when every Plyn tab is closed, or when
 * the reader taps "Update now" in the library. A page is never reloaded on its
 * own, and a long-open tab keeps the old precache, so its lazy chunks still load.
 */

type Listener = () => void;

let updateReady = false;
let apply: (() => Promise<void>) | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Called by the registration when a new version is installed and waiting. */
export function markUpdateReady(applyUpdate: () => Promise<void>): void {
  apply = applyUpdate;
  updateReady = true;
  emit();
}

/** Activates the waiting version and reloads. Only ever called from a tap. */
export async function applyUpdate(): Promise<void> {
  if (apply) await apply();
}

export function isUpdateReady(): boolean {
  return updateReady;
}

export function subscribeUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(subscribeUpdate, isUpdateReady, () => false);
}

/** For tests: forget a ready update. */
export function resetUpdateState(): void {
  updateReady = false;
  apply = null;
  emit();
}
