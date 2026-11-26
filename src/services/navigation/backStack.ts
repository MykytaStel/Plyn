/**
 * Back navigation for an installed PWA (0.22): every open layer (the reader,
 * a sheet) owns one browser history entry, so Android back, the browser back
 * button and the iOS edge swipe close the top layer instead of leaving Plyn.
 *
 * Layers close in two ways:
 * - by back: the browser already removed the entry, the stack calls `onBack`;
 * - by the UI (a close button, Escape): `release` removes the entry with
 *   `history.go(-n)`, and the popstate that follows is ignored.
 */

export interface HistoryLike {
  readonly state: unknown;
  pushState(data: unknown, unused: string): void;
  go(delta: number): void;
}

export interface PopStateTarget {
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

export type LayerToken = number;

export interface BackStack {
  /** Opens a layer: pushes one history entry. `onBack` runs if back closes it. */
  push(onBack: () => void): LayerToken;
  /** The UI closed this layer: drops its entry (and any above it). No-op if back already did. */
  release(token: LayerToken): void;
  /** Open layers, bottom first (for tests and debugging). */
  depth(): number;
  dispose(): void;
}

const STATE_KEY = 'plynLayer';

/** Depth stored in a history entry this module pushed, or 0. */
export function layerDepthOf(state: unknown): number {
  if (!state || typeof state !== 'object') return 0;
  const depth = (state as Record<string, unknown>)[STATE_KEY];
  return typeof depth === 'number' && depth > 0 ? depth : 0;
}

export function createBackStack(history: HistoryLike, target: PopStateTarget): BackStack {
  const layers: Array<{ token: LayerToken; onBack: () => void }> = [];
  let nextToken = 1;
  /** Popstate events caused by our own `go()`, not by the reader. */
  let ownPops = 0;

  const onPopState = () => {
    if (ownPops > 0) {
      ownPops -= 1;
      return;
    }
    const top = layers.pop();
    top?.onBack();
  };
  target.addEventListener('popstate', onPopState);

  // A reload keeps the entries of layers that were open: step back to the
  // base entry, so the first back press after a reload is not a silent one.
  const stale = layerDepthOf(history.state);
  if (stale > 0) {
    ownPops += 1;
    history.go(-stale);
  }

  return {
    push(onBack) {
      const token = nextToken;
      nextToken += 1;
      layers.push({ token, onBack });
      history.pushState({ [STATE_KEY]: layers.length }, '');
      return token;
    },
    release(token) {
      const index = layers.findIndex((layer) => layer.token === token);
      if (index === -1) return;
      const removed = layers.length - index;
      layers.splice(index);
      ownPops += 1;
      history.go(-removed);
    },
    depth: () => layers.length,
    dispose() {
      target.removeEventListener('popstate', onPopState);
    }
  };
}
