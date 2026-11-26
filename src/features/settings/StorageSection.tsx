import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import {
  getStorageStatus,
  requestPersistence,
  type StorageStatus
} from '../../services/storage/persistence';

/**
 * "Your library": how much Plyn stores here and whether the browser promised
 * to keep it (0.21). Calm wording only, no warning colours.
 */
export function StorageSection() {
  const i18n = useI18n();
  const t = i18n.m.settings;
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let alive = true;
    void getStorageStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!status || (!status.supported && status.usageBytes === null)) return null;

  const handleProtect = async () => {
    const granted = await requestPersistence();
    setDenied(!granted);
    setStatus(await getStorageStatus());
  };

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">{t.sections.library}</h3>
      <div className="setting-group storage-status">
        {status.usageBytes !== null && (
          <p className="setting-hint">
            {i18n.format(t.storageUsage, { size: i18n.bytes(status.usageBytes) })}
          </p>
        )}
        {status.supported && (
          <p className="setting-hint">
            {status.persisted
              ? t.storageProtected
              : denied
                ? t.storageDenied
                : t.storageNotProtected}
          </p>
        )}
        {status.supported && !status.persisted && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void handleProtect()}
          >
            {t.storageProtect}
          </button>
        )}
      </div>
    </section>
  );
}
