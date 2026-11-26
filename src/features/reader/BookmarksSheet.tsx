import { Download, X } from 'lucide-react';
import { formatBookmarksAsMarkdown } from '../../core/export/bookmarksMarkdown';
import type { ReadingCard } from '../../core/models/types';
import { findCardIndexByOffset } from '../../core/splitter/splitter';

interface BookmarksSheetProps {
  docTitle: string;
  cards: ReadingCard[];
  bookmarkOffsets: number[];
  bookmarkNotes: Record<string, string>;
  onSaveNote: (offset: number, note: string) => void;
  onSelectCard: (index: number) => void;
  onClose: () => void;
}

export function BookmarksSheet({
  docTitle,
  cards,
  bookmarkOffsets,
  bookmarkNotes,
  onSaveNote,
  onSelectCard,
  onClose
}: BookmarksSheetProps) {
  const seenCards = new Set<number>();
  const items: Array<{ offset: number; cardIndex: number; text: string }> = [];

  for (const offset of [...bookmarkOffsets].sort((a, b) => a - b)) {
    const idx = findCardIndexByOffset(cards, offset);
    if (seenCards.has(idx) || !cards[idx]) continue;
    seenCards.add(idx);
    items.push({ offset, cardIndex: idx, text: cards[idx].text });
  }

  const handleExportMd = () => {
    const md = formatBookmarksAsMarkdown({
      title: docTitle,
      cards,
      bookmarkOffsets,
      bookmarkNotes
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.slice(0, 40).replace(/[^\p{L}\p{N}_-]+/gu, '-')}-bookmarks.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmarks-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="bookmarks-title">Закладки</h2>
        <div className="sheet-header-actions">
          {items.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              title="Експортувати закладки й нотатки у Markdown"
              onClick={handleExportMd}
            >
              <Download size={14} />
              <span>.md</span>
            </button>
          )}
          <button
            className="icon-btn"
            type="button"
            aria-label="Закрити закладки"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="bookmarks-list">
        {items.length === 0 ? (
          <p className="bookmarks-empty">
            Поки немає закладок. Натисни на іконку прапорця або клавішу B під час
            читання.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.offset} className="bookmark-card-wrap">
              <button
                type="button"
                className="bookmark-item"
                onClick={() => onSelectCard(item.cardIndex)}
              >
                <span className="bookmark-item-num">
                  Картка {item.cardIndex + 1}
                </span>
                <span className="bookmark-item-text">{item.text}</span>
              </button>
              <input
                type="text"
                className="bookmark-note-input"
                placeholder="Додати коротку нотатку..."
                maxLength={240}
                defaultValue={bookmarkNotes[String(item.offset)] || ''}
                onBlur={(e) => onSaveNote(item.offset, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
