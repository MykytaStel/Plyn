import { X } from 'lucide-react';
import { findCardIndexByOffset } from '../../core/splitter/splitter';
import type { ReadingCard } from '../../core/models/types';

interface BookmarksSheetProps {
  cards: ReadingCard[];
  bookmarkOffsets: number[];
  onSelectCard: (index: number) => void;
  onClose: () => void;
}

export function BookmarksSheet({
  cards,
  bookmarkOffsets,
  onSelectCard,
  onClose
}: BookmarksSheetProps) {
  const uniqueCardIndices = Array.from(
    new Set(bookmarkOffsets.map((offset) => findCardIndexByOffset(cards, offset)))
  ).sort((a, b) => a - b);

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
        <button
          className="icon-btn"
          type="button"
          aria-label="Закрити закладки"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="bookmarks-list">
        {uniqueCardIndices.length === 0 ? (
          <p className="bookmarks-empty">
            Поки немає закладок. Натисни на іконку прапорця або клавішу B під час
            читання.
          </p>
        ) : (
          uniqueCardIndices.map((idx) => {
            const card = cards[idx];
            if (!card) return null;
            return (
              <button
                key={idx}
                type="button"
                className="bookmark-item"
                onClick={() => onSelectCard(idx)}
              >
                <span className="bookmark-item-num">Картка {idx + 1}</span>
                <span className="bookmark-item-text">{card.text}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
