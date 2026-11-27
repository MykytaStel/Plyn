import { Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../../i18n';
import { LANGUAGE_LABEL, LOCALE_NAMES, LOCALES } from '../../../i18n/locales';
import {
  getStorageStatus,
  requestPersistence,
  type StorageStatus
} from '../../../services/storage/persistence';
import { useSettingsStore } from '../../../store/useSettingsStore';
import type { BackupActions } from '../useBackupActions';

/** How much Plyn stores here and whether the browser promised to keep it (0.21). */
export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const refresh = useCallback(async () => setStatus(await getStorageStatus()), []);
  useEffect(() => {
    let alive = true;
    void getStorageStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { status, refresh };
}

interface LanguageLibrarySectionProps {
  /** Restore only from the library: with a text open it could clash with its progress. */
  canRestore: boolean;
  storage: StorageStatus | null;
  onStorageChange: () => Promise<void>;
  /** Owned by the sheet, so its status line outlives this section. */
  backup: BackupActions;
}

/**
 * Мова і бібліотека: UI language, storage use, backup and restore (moved from
 * the library header in 0.27), and the keyboard hint on fine pointers.
 */
export function LanguageLibrarySection({
  canRestore,
  storage,
  onStorageChange,
  backup
}: LanguageLibrarySectionProps) {
  const i18n = useI18n();
  const t = i18n.m.settings;
  const { language, updateSettings } = useSettingsStore();
  const [denied, setDenied] = useState(false);

  const showStorage = storage && (storage.supported || storage.usageBytes !== null);

  const handleProtect = async () => {
    const granted = await requestPersistence();
    setDenied(!granted);
    await onStorageChange();
  };

  return (
    <>
      <div className="setting-group">
        <div className="segmented segmented-2" role="radiogroup" aria-label={LANGUAGE_LABEL}>
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="radio"
              lang={locale}
              className={`seg-btn ${language === locale ? 'is-active' : ''}`}
              aria-checked={language === locale}
              onClick={() => updateSettings({ language: locale })}
            >
              {LOCALE_NAMES[locale]}
            </button>
          ))}
        </div>
      </div>

      {showStorage && (
        <div className="setting-group storage-status">
          {storage.usageBytes !== null && (
            <p className="setting-hint">
              {i18n.format(t.storageUsage, { size: i18n.bytes(storage.usageBytes) })}
            </p>
          )}
          {storage.supported && (
            <p className="setting-hint">
              {storage.persisted
                ? t.storageProtected
                : denied
                  ? t.storageDenied
                  : t.storageNotProtected}
            </p>
          )}
          {storage.supported && !storage.persisted && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void handleProtect()}
            >
              {t.storageProtect}
            </button>
          )}
        </div>
      )}

      <div className="setting-group backup-actions">
        <p className="setting-hint">{t.backupHint}</p>
        <div className="backup-buttons">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void backup.saveBackup()}
          >
            <Download size={14} aria-hidden="true" />
            <span>{t.backupSave}</span>
          </button>
          {canRestore && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={backup.chooseRestoreFile}
              >
                <Upload size={14} aria-hidden="true" />
                <span>{t.backupRestore}</span>
              </button>
              <input
                ref={backup.restoreInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => void backup.restoreFromFile(e)}
              />
            </>
          )}
        </div>
      </div>

      <p className="shortcuts-hint">
        {t.shortcuts.keyboard} <kbd>Space</kbd>/<kbd>↓</kbd> {t.shortcuts.next} ·{' '}
        <kbd>A</kbd> {t.shortcuts.anchor} · <kbd>F</kbd> {t.shortcuts.focus} ·{' '}
        <kbd>N</kbd> {t.shortcuts.thought} · <kbd>S</kbd> {t.shortcuts.speech} ·{' '}
        <kbd>Z</kbd> {t.shortcuts.zen}
      </p>
    </>
  );
}
