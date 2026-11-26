/**
 * Screen Wake Lock (0.22): keeps the screen on while the reader wants it.
 * The browser drops the lock whenever the page is hidden; it is taken again
 * when the page is visible and still wanted. Failures (battery saver, an
 * unsupported browser) are silent: the screen simply behaves as usual.
 */

export interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

export interface VisibilityTarget {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface ScreenWakeLock {
  readonly supported: boolean;
  setWanted(wanted: boolean): void;
  /** True while the browser holds a lock for us. */
  isHeld(): boolean;
  dispose(): void;
}

export function createScreenWakeLock(
  wakeLock: WakeLockLike | undefined,
  doc: VisibilityTarget
): ScreenWakeLock {
  let wanted = false;
  let sentinel: WakeLockSentinelLike | null = null;
  let pending = false;

  const releaseHeld = () => {
    const held = sentinel;
    sentinel = null;
    void held?.release().catch(() => {});
  };

  const sync = () => {
    if (!wakeLock) return;
    if (!wanted) {
      releaseHeld();
      return;
    }
    if (sentinel || pending || doc.visibilityState !== 'visible') return;
    pending = true;
    wakeLock
      .request('screen')
      .then((lock) => {
        pending = false;
        sentinel = lock;
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
        });
        // Not wanted any more while the request was on its way.
        if (!wanted) releaseHeld();
      })
      .catch(() => {
        pending = false;
      });
  };

  doc.addEventListener('visibilitychange', sync);

  return {
    supported: Boolean(wakeLock),
    setWanted(next) {
      wanted = next;
      sync();
    },
    isHeld: () => sentinel !== null,
    dispose() {
      doc.removeEventListener('visibilitychange', sync);
      wanted = false;
      releaseHeld();
    }
  };
}

let shared: ScreenWakeLock | null = null;

/** The page's wake lock, bound to `navigator.wakeLock` (absent in older browsers). */
export function screenWakeLock(): ScreenWakeLock {
  shared ??= createScreenWakeLock(
    (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock,
    document
  );
  return shared;
}
