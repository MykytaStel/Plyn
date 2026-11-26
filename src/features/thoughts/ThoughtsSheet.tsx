import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../../i18n';
import { Plus, Trash2, X } from 'lucide-react';
import {
  addThoughtNote,
  db,
  removeThoughtNote
} from '../../services/storage/db';

interface ThoughtsSheetProps {
  currentDocTitle?: string;
  onClose: () => void;
}

export function ThoughtsSheet({
  currentDocTitle,
  onClose
}: ThoughtsSheetProps) {
  const t = useI18n().m.thoughts;
  const [draft, setDraft] = useState('');
  const thoughts = useLiveQuery(
    () => db.thoughts.orderBy('createdAt').reverse().toArray(),
    []
  );

  const handleAdd = async () => {
    if (!draft.trim()) return;
    await addThoughtNote(draft, currentDocTitle);
    setDraft('');
  };

  return (
    <aside
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thoughts-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <div>
          <h2 id="thoughts-title">{t.title}</h2>
          <p className="setting-hint">
            {t.subtitle}
          </p>
        </div>
        <button
          className="icon-btn"
          type="button"
          aria-label={t.close}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="thought-input-row">
        <input
          type="text"
          className="url-input"
          placeholder={t.placeholder}
          maxLength={280}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAdd();
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!draft.trim()}
          onClick={() => void handleAdd()}
        >
          <Plus size={15} />
          <span>{t.save}</span>
        </button>
      </div>

      <div className="thoughts-list">
        {!thoughts || thoughts.length === 0 ? (
          <p className="bookmarks-empty">
            {t.empty}
          </p>
        ) : (
          thoughts.map((item) => (
            <div key={item.id} className="thought-item">
              <div className="thought-item-body">
                <p className="thought-item-text">{item.text}</p>
                {item.docTitle && (
                  <span className="thought-item-meta">
                    {t.during} {item.docTitle}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="library-action-btn"
                aria-label={t.delete}
                onClick={() => void removeThoughtNote(item.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
