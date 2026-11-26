import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackStack, layerDepthOf, type HistoryLike, type PopStateTarget } from './backStack';

/**
 * A minimal browser history: entries, a cursor, and popstate fired
 * asynchronously on traversal, as browsers do.
 */
class FakeHistory implements HistoryLike, PopStateTarget {
  entries: unknown[] = [null];
  index = 0;
  private listeners = new Set<() => void>();
  private queue: Array<() => void> = [];

  get state() {
    return this.entries[this.index];
  }
  pushState(data: unknown) {
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(data);
    this.index += 1;
  }
  go(delta: number) {
    this.queue.push(() => {
      const next = Math.max(0, Math.min(this.entries.length - 1, this.index + delta));
      if (next === this.index) return;
      this.index = next;
      this.listeners.forEach((l) => l());
    });
  }
  /** The reader presses back. */
  back() {
    this.go(-1);
  }
  /** Lets queued traversals run. */
  flush() {
    while (this.queue.length) this.queue.shift()!();
  }
  addEventListener(_type: 'popstate', l: () => void) {
    this.listeners.add(l);
  }
  removeEventListener(_type: 'popstate', l: () => void) {
    this.listeners.delete(l);
  }
}

let h: FakeHistory;
beforeEach(() => {
  h = new FakeHistory();
});

describe('backStack', () => {
  it('back closes the top layer, then the one below, then leaves', () => {
    const stack = createBackStack(h, h);
    const closeReader = vi.fn();
    const closeSheet = vi.fn();
    stack.push(closeReader);
    stack.push(closeSheet);
    expect(h.entries).toHaveLength(3);

    h.back();
    h.flush();
    expect(closeSheet).toHaveBeenCalledOnce();
    expect(closeReader).not.toHaveBeenCalled();

    h.back();
    h.flush();
    expect(closeReader).toHaveBeenCalledOnce();
    expect(stack.depth()).toBe(0);
    expect(h.index).toBe(0);
  });

  it('a layer closed by the UI removes its entry without calling onBack', () => {
    const stack = createBackStack(h, h);
    const closeReader = vi.fn();
    const closeSheet = vi.fn();
    stack.push(closeReader);
    const sheet = stack.push(closeSheet);
    stack.release(sheet);
    h.flush();
    expect(closeSheet).not.toHaveBeenCalled();
    expect(h.index).toBe(1);

    // The next back goes to the reader, not past it.
    h.back();
    h.flush();
    expect(closeReader).toHaveBeenCalledOnce();
  });

  it('release after back is a no-op', () => {
    const stack = createBackStack(h, h);
    const token = stack.push(() => stack.release(token));
    h.back();
    h.flush();
    expect(h.index).toBe(0);
    expect(stack.depth()).toBe(0);
  });

  it('closing one sheet and opening another at once keeps one entry per layer', () => {
    const stack = createBackStack(h, h);
    const closeReader = vi.fn();
    const closeBookmarks = vi.fn();
    stack.push(closeReader);
    const tools = stack.push(vi.fn());
    stack.release(tools);
    stack.push(closeBookmarks); // before the browser ran go(-1)
    h.flush();

    h.back();
    h.flush();
    expect(closeBookmarks).toHaveBeenCalledOnce();
    expect(closeReader).not.toHaveBeenCalled();
    h.back();
    h.flush();
    expect(closeReader).toHaveBeenCalledOnce();
  });

  it('closing a lower layer drops the layers above it too', () => {
    const stack = createBackStack(h, h);
    const reader = stack.push(vi.fn());
    stack.push(vi.fn());
    stack.release(reader);
    h.flush();
    expect(stack.depth()).toBe(0);
    expect(h.index).toBe(0);
  });

  it('after a reload with layers open, steps back to the base entry', () => {
    h.pushState({ plynLayer: 1 });
    h.pushState({ plynLayer: 2 });
    const stack = createBackStack(h, h);
    h.flush();
    expect(h.index).toBe(0);
    expect(stack.depth()).toBe(0);
  });

  it('reads the depth only from its own entries', () => {
    expect(layerDepthOf({ plynLayer: 2 })).toBe(2);
    expect(layerDepthOf({})).toBe(0);
    expect(layerDepthOf(null)).toBe(0);
    expect(layerDepthOf({ plynLayer: 'x' })).toBe(0);
  });
});
