import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { PlynDocument } from '../../core/models/types';
import { estimateReadingMinutes } from '../../core/reading/readingStats';

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
    <article
      className="library-card"
      tabIndex={isEditing ? -1 : 0}
      role="button"
      aria-label={`Відкрити ${doc.title}`}
      onClick={() => {
        if (!isEditing) onOpen(doc);
      }}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(doc);
        }
      }}
    >
      <div className="library-card-top">
        {isEditing ? (
          <div
            className="library-rename-row"
            onClick={(e) => e.stopPropagation()}
          >
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
              aria-label="Зберегти назву"
              onClick={commitRename}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              className="library-action-btn"
              aria-label="Скасувати"
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
            <h3 className="library-card-title">{doc.title}</h3>
            <div className="library-card-actions">
              <button
                type="button"
                className="library-action-btn"
                aria-label={`Перейменувати ${doc.title}`}
                title="Перейменувати"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftTitle(doc.title);
                  setIsEditing(true);
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="library-action-btn"
                aria-label={`Видалити ${doc.title}`}
                title="Видалити з бібліотеки"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="library-card-meta">
        <span>
          Картка {current + 1} з {total} · {percent}%
        </span>
        {estMinutes > 0 && <span>· ~{estMinutes} хв</span>}
        {bookmarksCount > 0 && <span>· Закладок: {bookmarksCount}</span>}
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
