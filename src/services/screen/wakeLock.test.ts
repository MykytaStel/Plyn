import { describe, expect, it } from 'vitest';
import { createScreenWakeLock, type VisibilityTarget, type WakeLockSentinelLike } from './wakeLock';

class FakeSentinel implements WakeLockSentinelLike {
  released = false;
  private listeners: Array<() => void> = [];
  async release() {
    if (this.released) return;
    this.released = true;
    this.listeners.forEach((l) => l());
  }
  addEventListener(_t: 'release', l: () => void) {
    this.listeners.push(l);
  }
}

class FakeWakeLock {
  requests = 0;
  fail = false;
  sentinels: FakeSentinel[] = [];
  async request() {
    this.requests += 1;
    if (this.fail) throw new Error('NotAllowedError');
    const s = new FakeSentinel();
    this.sentinels.push(s);
    return s;
  }
}

class FakeDoc implements VisibilityTarget {
  visibilityState = 'visible';
  private listeners = new Set<() => void>();
  addEventListener(_t: 'visibilitychange', l: () => void) {
    this.listeners.add(l);
  }
  removeEventListener(_t: 'visibilitychange', l: () => void) {
    this.listeners.delete(l);
  }
  /** The page is hidden: the browser releases every lock, as it does. */
  hide(wl: FakeWakeLock) {
    this.visibilityState = 'hidden';
    wl.sentinels.forEach((s) => void s.release());
    this.listeners.forEach((l) => l());
  }
  show() {
    this.visibilityState = 'visible';
    this.listeners.forEach((l) => l());
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('screen wake lock', () => {
  it('holds the lock while wanted and releases it after', async () => {
    const wl = new FakeWakeLock();
    const lock = createScreenWakeLock(wl, new FakeDoc());
    lock.setWanted(true);
    await tick();
    expect(lock.isHeld()).toBe(true);
    lock.setWanted(false);
    await tick();
    expect(lock.isHeld()).toBe(false);
    expect(wl.sentinels[0].released).toBe(true);
  });

  it('takes the lock again when the page comes back', async () => {
    const wl = new FakeWakeLock();
    const doc = new FakeDoc();
    const lock = createScreenWakeLock(wl, doc);
    lock.setWanted(true);
    await tick();
    doc.hide(wl);
    await tick();
    expect(lock.isHeld()).toBe(false);
    doc.show();
    await tick();
    expect(lock.isHeld()).toBe(true);
    expect(wl.requests).toBe(2);
  });

  it('does not ask twice while a request is on its way', async () => {
    const wl = new FakeWakeLock();
    const lock = createScreenWakeLock(wl, new FakeDoc());
    lock.setWanted(true);
    lock.setWanted(true);
    await tick();
    expect(wl.requests).toBe(1);
  });

  it('lets go of a lock that arrives after it stopped being wanted', async () => {
    const wl = new FakeWakeLock();
    const lock = createScreenWakeLock(wl, new FakeDoc());
    lock.setWanted(true);
    lock.setWanted(false);
    await tick();
    expect(lock.isHeld()).toBe(false);
    expect(wl.sentinels[0].released).toBe(true);
  });

  it('a refused request is silent, and no request is made while hidden', async () => {
    const wl = new FakeWakeLock();
    const doc = new FakeDoc();
    doc.visibilityState = 'hidden';
    const lock = createScreenWakeLock(wl, doc);
    lock.setWanted(true);
    await tick();
    expect(wl.requests).toBe(0);
    wl.fail = true;
    doc.show();
    await tick();
    expect(lock.isHeld()).toBe(false);
  });

  it('without the API it does nothing', () => {
    const lock = createScreenWakeLock(undefined, new FakeDoc());
    expect(lock.supported).toBe(false);
    lock.setWanted(true);
    expect(lock.isHeld()).toBe(false);
  });
});
