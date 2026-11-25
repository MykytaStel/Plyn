import { Trash2 } from 'lucide-react';
import type { PlynDocument } from '../../core/models/types';

interface LibraryCardProps {
  doc: PlynDocument;
  onOpen: (doc: PlynDocument) => void;
  onDelete: (id: string) => void;
}

export function LibraryCard({ doc, onOpen, onDelete }: LibraryCardProps) {
  const total = Math.max(1, doc.totalCards || 1);
  const current = Math.min(doc.currentIndex || 0, total - 1);
  const percent = Math.round(((current + 1) / total) * 100);
  const bookmarksCount = doc.bookmarkOffsets?.length ?? 0;

  return (
    <article
      className="library-card"
      tabIndex={0}
      role="button"
      aria-label={`Відкрити ${doc.title}`}
      onClick={() => onOpen(doc)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(doc);
        }
      }}
    >
      <div className="library-card-top">
        <h3 className="library-card-title">{doc.title}</h3>
        <button
          type="button"
          className="library-delete-btn"
          aria-label={`Видалити ${doc.title}`}
          title="Видалити з бібліотеки"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(doc.id);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="library-card-meta">
        <span>
          Картка {current + 1} з {total} · {percent}%
        </span>
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
