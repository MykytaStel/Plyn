import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupFileName, saveBackupFile } from './backupFile';
import { db } from './db';

function setPointer(coarse: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({ matches: coarse && q === '(pointer: coarse)' }))
  );
}

let clicked: HTMLAnchorElement[] = [];

beforeEach(async () => {
  await db.delete();
  await db.open();
  clicked = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push(this);
  });
  URL.createObjectURL = vi.fn(() => 'blob:backup');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

function stubShare(impl: () => Promise<void>) {
  const share = vi.fn(impl);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  return share;
}

describe('saveBackupFile', () => {
  it('names the file by the local date, like the thoughts file', () => {
    expect(backupFileName(new Date(2026, 10, 26, 0, 30))).toBe('plyn-backup-2026-11-26.json');
    expect(backupFileName(new Date(2026, 10, 26, 23, 30))).toBe('plyn-backup-2026-11-26.json');
  });

  it('downloads on a desktop, even if the share sheet exists', async () => {
    setPointer(false);
    const share = stubShare(async () => {});
    expect(await saveBackupFile()).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(clicked[0].download).toMatch(/^plyn-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('opens the share sheet with a v2 JSON file on a phone', async () => {
    setPointer(true);
    const share = stubShare(async () => {});
    expect(await saveBackupFile()).toBe('shared');
    const file = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0];
    expect(file.type).toBe('application/json');
    expect(JSON.parse(await file.text()).schemaVersion).toBe(2);
    expect(clicked).toHaveLength(0);
  });

  it('treats a closed share sheet as a choice, not an error', async () => {
    setPointer(true);
    stubShare(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    expect(await saveBackupFile()).toBe('cancelled');
    expect(clicked).toHaveLength(0);
  });

  it('falls back to a download when sharing fails', async () => {
    setPointer(true);
    stubShare(async () => {
      throw new DOMException('no', 'NotAllowedError');
    });
    expect(await saveBackupFile()).toBe('downloaded');
    expect(clicked).toHaveLength(1);
  });

  it('downloads on a phone without the share sheet', async () => {
    setPointer(true);
    expect(await saveBackupFile()).toBe('downloaded');
  });
});
