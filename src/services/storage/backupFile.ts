import { toLocalDateKey } from '../../core/reading/weeklyActivity';
import { saveFile, type SaveFileResult } from '../files/saveFile';
import { exportLibraryBackup } from './backup';

export type BackupSaveResult = SaveFileResult;

/** `plyn-backup-YYYY-MM-DD.json` using the local date (the day the reader sees). */
export function backupFileName(date = new Date()): string {
  return `plyn-backup-${toLocalDateKey(date)}.json`;
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
