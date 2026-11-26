import { useState } from 'react';
import { useI18n } from '../../i18n';
import { applyUpdate, useUpdateReady } from '../../services/pwa/updates';

/**
 * A quiet line in the library when a new version of Plyn is waiting (0.22).
 * Never shown in the reader: an update must not interrupt a text.
 */
export function UpdateNotice() {
  const t = useI18n().m.library.update;
  const ready = useUpdateReady();
  const [applying, setApplying] = useState(false);
  if (!ready) return null;

  return (
    <p className="update-notice" role="status">
      <span>{t.ready}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={applying}
        onClick={() => {
          setApplying(true);
          void applyUpdate();
        }}
      >
        {t.apply}
      </button>
    </p>
  );
}
