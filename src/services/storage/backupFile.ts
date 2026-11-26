import { exportLibraryBackup } from './backup';

export type BackupSaveResult = 'shared' | 'downloaded' | 'cancelled';

export function backupFileName(date = new Date()): string {
  return `plyn-backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Phones and tablets: the share sheet sends the file to Files / iCloud / Drive in one step. */
function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * Builds a backup and hands it to the reader: the share sheet on touch devices,
 * a download elsewhere. Depends only on IndexedDB, so the error screen can use it.
 */
export async function saveBackupFile(): Promise<BackupSaveResult> {
  const payload = await exportLibraryBackup();
  const json = JSON.stringify(payload, null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });

  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Share failed for another reason: fall back to a download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // Some browsers start the download asynchronously after the click.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
