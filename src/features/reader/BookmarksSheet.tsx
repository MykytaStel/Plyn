import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { formatBookmarksAsMarkdown } from '../../core/export/bookmarksMarkdown';
import type { DocumentChapter, ReadingCard } from '../../core/models/types';
import { useI18n } from '../../i18n';
import { findCardIndexByOffset } from '../../core/splitter/splitter';
import { useDialogFocus } from '../shared/useDialogFocus';
import { saveFile } from '../../services/files/saveFile';

interface BookmarksSheetProps {
  docTitle: string;
  cards: ReadingCard[];
  bookmarkOffsets: number[];
  bookmarkNotes: Record<string, string>;
  onSaveNote: (offset: number, note: string) => void;
  onSelectCard: (index: number) => void;
  /** The book's table of contents (0.23); the sheet shows it first. */
  chapters?: DocumentChapter[];
  /** Start of the card being read, to mark the current chapter. */
  currentOffset?: number;
  onClose: () => void;
}

/** The last chapter that starts at or before `offset`. */
export function currentChapterIndex(chapters: DocumentChapter[], offset: number): number {
  let found = -1;
  chapters.forEach((c, i) => {
    if (c.offset <= offset) found = i;
  });
  return found;
}

export function BookmarksSheet({
  docTitle,
  cards,
  bookmarkOffsets,
  bookmarkNotes,
  onSaveNote,
  onSelectCard,
  chapters,
  currentOffset = 0,
  onClose
}: BookmarksSheetProps) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const i18n = useI18n();
  const t = i18n.m.bookmarks;
  const hasContents = Boolean(chapters && chapters.length > 0);
  const [view, setView] = useState<'contents' | 'bookmarks'>(
    hasContents ? 'contents' : 'bookmarks'
  );
  const currentChapter = hasContents ? currentChapterIndex(chapters!, currentOffset) : -1;
  const currentRef = useRef<HTMLButtonElement>(null);

  // Open the contents where the reader is, not at the top of a long list.
  useEffect(() => {
    if (view === 'contents') currentRef.current?.scrollIntoView?.({ block: 'center' });
  }, [view]);
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
      bookmarkNotes,
      labels: i18n.m.export
    });
    const name = `${docTitle.slice(0, 40).replace(/[^\p{L}\p{N}_-]+/gu, '-')}-bookmarks.md`;
    void saveFile(new File([md], name, { type: 'text/markdown;charset=utf-8' }));
  };

  return (
    <aside
      ref={dialogRef}
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmarks-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="bookmarks-title">{hasContents ? t.titleWithContents : t.title}</h2>
        <div className="sheet-header-actions">
          {view === 'bookmarks' && items.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              title={t.exportHint}
              onClick={handleExportMd}
            >
              <Download size={14} />
              <span>.md</span>
            </button>
          )}
          <button
            className="icon-btn"
            type="button"
            aria-label={hasContents ? t.closeWithContents : t.close}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {hasContents && (
        <div className="segmented segmented-2 sheet-view-switch" role="group" aria-label={t.view}>
          <button
            type="button"
            className={`seg-btn ${view === 'contents' ? 'is-active' : ''}`}
            aria-pressed={view === 'contents'}
            onClick={() => setView('contents')}
          >
            {t.contents}
          </button>
          <button
            type="button"
            className={`seg-btn ${view === 'bookmarks' ? 'is-active' : ''}`}
            aria-pressed={view === 'bookmarks'}
            onClick={() => setView('bookmarks')}
          >
            {t.title}
            {items.length > 0 ? ` · ${i18n.number(items.length)}` : ''}
          </button>
        </div>
      )}

      {view === 'contents' && hasContents && (
        <ol className="contents-list" aria-label={t.contents}>
          {chapters!.map((chapter, i) => (
            <li key={`${chapter.offset}-${i}`}>
              <button
                ref={i === currentChapter ? currentRef : undefined}
                type="button"
                className={`contents-item ${i === currentChapter ? 'is-current' : ''}`}
                style={{ paddingInlineStart: `${14 + Math.min(chapter.level, 4) * 16}px` }}
                aria-current={i === currentChapter ? 'location' : undefined}
                onClick={() => onSelectCard(findCardIndexByOffset(cards, chapter.offset))}
              >
                <span className="contents-item-title">{chapter.title}</span>
                {i === currentChapter && (
                  <span className="contents-item-here">{t.current}</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}

      {view === 'bookmarks' && (
      <div className="bookmarks-list">
        {items.length === 0 ? (
          <p className="bookmarks-empty">
            {t.empty}
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
                  {i18n.format(i18n.m.export.card, { n: i18n.number(item.cardIndex + 1) })}
                </span>
                <span className="bookmark-item-text">{item.text}</span>
              </button>
              <input
                type="text"
                className="bookmark-note-input"
                placeholder={t.notePlaceholder}
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
      )}
    </aside>
  );
}
