import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { currentI18n } from '../../i18n';
import { errorMessage } from '../../i18n/errorMessage';
import { importLibraryBackup } from '../../services/storage/backup';
import { saveBackupFile } from '../../services/storage/backupFile';
import { useSettingsStore } from '../../store/useSettingsStore';

const FEEDBACK_MS = 3600;

/**
 * Save and restore a backup (moved from the library header to Settings in
 * 0.27). `feedback` is the last calm status line, cleared after a while.
 */
export function useBackupActions() {
  const [feedback, setFeedback] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const show = (msg: string) => {
    setFeedback(msg);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback(''), FEEDBACK_MS);
  };

  const saveBackup = async () => {
    const t = currentI18n().m.library.feedback;
    try {
      const result = await saveBackupFile();
      // Closing the share sheet is a choice, not something to report.
      if (result !== 'cancelled') show(t.backupSaved);
    } catch {
      show(t.backupFailed);
    }
  };

  const chooseRestoreFile = () => restoreInputRef.current?.click();

  const restoreFromFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const i18n = currentI18n();
    const t = i18n.m.library.feedback;
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const { importedDocs, importedThoughts, appliedSettings } = await importLibraryBackup(raw);
      // Settings were restored on a device that had none: apply them now.
      if (appliedSettings) useSettingsStore.getState().updateSettings(appliedSettings);
      const texts = i18n.plural(i18n.m.common.texts, importedDocs);
      show(
        importedThoughts > 0
          ? i18n.format(t.backupImportedWithThoughts, {
              texts,
              thoughts: i18n.plural(i18n.m.common.thoughts, importedThoughts)
            })
          : i18n.format(t.backupImported, { texts })
      );
    } catch (err) {
      show(errorMessage(err, i18n.m, i18n.m.errors.backup_read));
    } finally {
      e.target.value = '';
    }
  };

  return { feedback, saveBackup, chooseRestoreFile, restoreFromFile, restoreInputRef };
}
