import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { PlynDocument } from '../../core/models/types';
import { estimateReadingMinutes } from '../../core/reading/readingStats';
import { useI18n } from '../../i18n';

interface LibraryCardProps {
  doc: PlynDocument;
  onOpen: (doc: PlynDocument) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function LibraryCard({
  doc,
  onOpen,
  onRename,
  onDelete
}: LibraryCardProps) {
  const i18n = useI18n();
  const t = i18n.m.libraryCard;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(doc.title);

  const total = Math.max(1, doc.totalCards || 1);
  const current = Math.min(doc.currentIndex || 0, total - 1);
  const percent = Math.round(((current + 1) / total) * 100);
  const bookmarksCount = doc.bookmarkOffsets?.length ?? 0;
  const estMinutes = estimateReadingMinutes(doc.text);

  const commitRename = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== doc.title) {
      onRename(doc.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    // The title is a real button stretched over the card (CSS ::after), so the
    // card opens on click anywhere without nesting buttons inside a button.
    <article className="library-card" data-doc-id={doc.id}>
      <div className="library-card-top">
        {isEditing ? (
          <div className="library-rename-row">
            <input
              className="library-rename-input"
              type="text"
              value={draftTitle}
              maxLength={120}
              autoFocus
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraftTitle(doc.title);
                  setIsEditing(false);
                }
              }}
            />
            <button
              type="button"
              className="library-action-btn"
              aria-label={t.saveTitle}
              onClick={commitRename}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              className="library-action-btn"
              aria-label={i18n.m.common.cancel}
              onClick={() => {
                setDraftTitle(doc.title);
                setIsEditing(false);
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <h3 className="library-card-title" title={doc.title}>
              <button
                type="button"
                className="library-card-open"
                aria-label={i18n.format(t.open, { title: doc.title })}
                onClick={() => onOpen(doc)}
              >
                {doc.title}
              </button>
            </h3>
            <div className="library-card-actions">
              <button
                type="button"
                className="library-action-btn"
                aria-label={i18n.format(t.rename, { title: doc.title })}
                title={t.renameHint}
                onClick={() => {
                  setDraftTitle(doc.title);
                  setIsEditing(true);
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="library-action-btn"
                aria-label={i18n.format(t.delete, { title: doc.title })}
                title={t.deleteHint}
                onClick={() => onDelete(doc.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {doc.author && <p className="library-card-author">{doc.author}</p>}

      <div className="library-card-meta">
        <span>
          {i18n.format(t.progress, {
            current: i18n.number(current + 1),
            total: i18n.number(total),
            percent
          })}
        </span>
        {estMinutes > 0 && (
          <span>· {i18n.format(i18n.m.common.minutesApprox, { minutes: estMinutes })}</span>
        )}
        {bookmarksCount > 0 && (
          <span>· {i18n.format(t.bookmarks, { count: i18n.number(bookmarksCount) })}</span>
        )}
      </div>

      <div className="library-progress-bar">
        <div
          className="library-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </article>
  );
}
