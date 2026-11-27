import { saveFile, type SaveFileResult } from '../files/saveFile';
import { exportLibraryBackup } from './backup';

export type BackupSaveResult = SaveFileResult;

export function backupFileName(date = new Date()): string {
  return `plyn-backup-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Builds a backup and hands it to the reader: the share sheet on touch devices,
 * a download elsewhere. Depends only on IndexedDB, so the error screen can use it.
 */
export async function saveBackupFile(): Promise<BackupSaveResult> {
  const payload = await exportLibraryBackup();
  const json = JSON.stringify(payload, null, 2);
  const file = new File([json], backupFileName(), { type: 'application/json' });
  return saveFile(file);
}
