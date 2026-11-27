import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../../i18n';
import { Download, Plus, Trash2, X } from 'lucide-react';
import {
  addThoughtNote,
  db,
  removeThoughtNote
} from '../../services/storage/db';
import {
  formatThoughtsAsMarkdown,
  thoughtsFileName
} from '../../core/export/thoughtsMarkdown';
import type { ThoughtNote } from '../../core/models/types';
import { useDialogFocus } from '../shared/useDialogFocus';

interface ThoughtsSheetProps {
  currentDocTitle?: string;
  /** Thoughts parked since this time (ms) are listed first, under "this reading". */
  sessionSince?: number;
  onClose: () => void;
}

export function ThoughtsSheet({
  currentDocTitle,
  sessionSince,
  onClose
}: ThoughtsSheetProps) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const i18n = useI18n();
  const t = i18n.m.thoughts;
  const [draft, setDraft] = useState('');
  const thoughts = useLiveQuery(
    () => db.thoughts.orderBy('createdAt').reverse().toArray(),
    []
  );

  const sessionItems =
    sessionSince === undefined || !thoughts
      ? []
      : thoughts.filter((x) => x.createdAt >= sessionSince);
  const otherItems =
    sessionSince === undefined || !thoughts
      ? (thoughts ?? [])
      : thoughts.filter((x) => x.createdAt < sessionSince);

  const renderItem = (item: ThoughtNote) => (
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
  );

  const handleAdd = async () => {
    if (!draft.trim()) return;
    await addThoughtNote(draft, currentDocTitle);
    setDraft('');
  };

  const handleExport = () => {
    if (!thoughts || thoughts.length === 0) return;
    const dateFormat = new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium' });
    const md = formatThoughtsAsMarkdown({
      thoughts,
      labels: { title: i18n.m.export.thoughts, untitled: i18n.m.export.untitled },
      formatDate: (ms) => dateFormat.format(new Date(ms))
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = thoughtsFileName(new Date());
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      ref={dialogRef}
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
          <>
            {sessionItems.length > 0 && (
              <>
                <h3 className="thoughts-group-title">{t.thisSession}</h3>
                {sessionItems.map(renderItem)}
              </>
            )}
            {otherItems.map(renderItem)}
          </>
        )}
      </div>

      {thoughts && thoughts.length > 0 && (
        <div className="thoughts-export">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={15} />
            <span>{t.export}</span>
          </button>
          <p className="setting-hint">{t.exportHint}</p>
        </div>
      )}
    </aside>
  );
}
