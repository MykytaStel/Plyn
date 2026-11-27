import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REVOKE_DELAY_MS, saveFile } from './saveFile';

function setPointer(coarse: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({ matches: coarse && q === '(pointer: coarse)' }))
  );
}

function stubShare(impl: () => Promise<void>, canShare = true) {
  const share = vi.fn(impl);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: () => canShare, configurable: true });
  return share;
}

let clicked: HTMLAnchorElement[] = [];
const file = () => new File(['# hi'], 'notes.md', { type: 'text/markdown' });

beforeEach(() => {
  clicked = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this);
  });
  URL.createObjectURL = vi.fn(() => 'blob:file');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('saveFile', () => {
  it('downloads under the file name on a desktop, even if sharing exists', async () => {
    setPointer(false);
    const share = stubShare(async () => {});
    expect(await saveFile(file())).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(clicked[0].download).toBe('notes.md');
    expect(clicked[0].href).toBe('blob:file');
  });

  it('shares the file on a touch device', async () => {
    setPointer(true);
    const share = stubShare(async () => {});
    const f = file();
    expect(await saveFile(f)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [f] });
    expect(clicked).toHaveLength(0);
  });

  it('downloads on a touch device that cannot share this file', async () => {
    setPointer(true);
    const share = stubShare(async () => {}, false);
    expect(await saveFile(file())).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
  });

  it('downloads on a touch device without the share sheet', async () => {
    setPointer(true);
    expect(await saveFile(file())).toBe('downloaded');
    expect(clicked).toHaveLength(1);
  });

  it('reports a closed share sheet as cancelled', async () => {
    setPointer(true);
    stubShare(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    expect(await saveFile(file())).toBe('cancelled');
    expect(clicked).toHaveLength(0);
  });

  it('falls back to a download when sharing fails', async () => {
    setPointer(true);
    stubShare(async () => {
      throw new DOMException('no', 'NotAllowedError');
    });
    expect(await saveFile(file())).toBe('downloaded');
    expect(clicked).toHaveLength(1);
  });

  it('revokes the object URL only after a delay', async () => {
    vi.useFakeTimers();
    setPointer(false);
    await saveFile(file());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file');
  });
});
