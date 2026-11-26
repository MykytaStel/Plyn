import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
          <h2 id="thoughts-title">Парковка думок</h2>
          <p className="setting-hint">
            Запиши сторонню думку за 2 секунди й повертайся до читання
          </p>
        </div>
        <button
          className="icon-btn"
          type="button"
          aria-label="Закрити парковку думок"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="thought-input-row">
        <input
          type="text"
          className="url-input"
          placeholder="Наприклад: відповісти на лист, купити каву..."
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
          <span>Записати</span>
        </button>
      </div>

      <div className="thoughts-list">
        {!thoughts || thoughts.length === 0 ? (
          <p className="bookmarks-empty">
            Тут порожньо. Коли під час читання вирине стороння думка — натисни
            іконку лампочки або клавішу N.
          </p>
        ) : (
          thoughts.map((item) => (
            <div key={item.id} className="thought-item">
              <div className="thought-item-body">
                <p className="thought-item-text">{item.text}</p>
                {item.docTitle && (
                  <span className="thought-item-meta">
                    Під час: {item.docTitle}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="library-action-btn"
                aria-label="Видалити думку"
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
