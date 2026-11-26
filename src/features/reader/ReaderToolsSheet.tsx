import type { ReactNode } from 'react';
import {
  Bookmark,
  EyeOff,
  Focus,
  SlidersHorizontal,
  Square,
  Volume2,
  X
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useDialogFocus } from '../shared/useDialogFocus';

interface ReaderToolsSheetProps {
  ttsAvailable: boolean;
  isSpeaking: boolean;
  anchorMode: boolean;
  sentenceFocus: boolean;
  bookmarksCount: number;
  /** The open book has a table of contents (0.23). */
  hasContents?: boolean;
  onSpeak: () => void;
  onAnchor: () => void;
  onSentenceFocus: () => void;
  onZen: () => void;
  onBookmarks: () => void;
  onSettings: () => void;
  onClose: () => void;
}

/**
 * The "⋯" menu on narrow screens: the less frequent reader tools, so the
 * toolbar keeps only back, progress, thought and bookmark.
 */
export function ReaderToolsSheet({
  ttsAvailable,
  isSpeaking,
  anchorMode,
  sentenceFocus,
  bookmarksCount,
  hasContents = false,
  onSpeak,
  onAnchor,
  onSentenceFocus,
  onZen,
  onBookmarks,
  onSettings,
  onClose
}: ReaderToolsSheetProps) {
  const dialogRef = useDialogFocus<HTMLElement>();
  const i18n = useI18n();
  const t = i18n.m.reader.tools;

  return (
    <aside
      ref={dialogRef}
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tools-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="tools-title">{t.title}</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label={i18n.m.settings.close}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="tools-list">
        {ttsAvailable && (
          <ToolRow
            icon={isSpeaking ? <Square size={16} /> : <Volume2 size={18} />}
            label={isSpeaking ? t.stopSpeech : t.speak}
            onClick={onSpeak}
          />
        )}
        <ToolRow
          icon={
            <span className="anchor-icon-glyph">
              <strong>{i18n.m.reader.anchorButton.bold}</strong>
              {i18n.m.reader.anchorButton.rest}
            </span>
          }
          label={t.anchor}
          checked={anchorMode}
          onClick={onAnchor}
        />
        <ToolRow
          icon={<Focus size={18} />}
          label={t.sentenceFocus}
          checked={sentenceFocus}
          onClick={onSentenceFocus}
        />
        <ToolRow icon={<EyeOff size={17} />} label={t.zen} onClick={onZen} />
        {(bookmarksCount > 0 || hasContents) && (
          <ToolRow
            icon={<Bookmark size={18} />}
            label={hasContents ? t.contents : t.bookmarks}
            trailing={bookmarksCount > 0 ? i18n.number(bookmarksCount) : undefined}
            onClick={onBookmarks}
          />
        )}
        <ToolRow
          icon={<SlidersHorizontal size={18} />}
          label={t.settings}
          onClick={onSettings}
        />
      </div>
    </aside>
  );
}

function ToolRow({
  icon,
  label,
  checked,
  trailing,
  onClick
}: {
  icon: ReactNode;
  label: string;
  /** Set for on/off tools: rendered as a switch. */
  checked?: boolean;
  trailing?: string;
  onClick: () => void;
}) {
  const isSwitch = checked !== undefined;
  return (
    <button
      type="button"
      className="tools-row"
      role={isSwitch ? 'switch' : undefined}
      aria-checked={isSwitch ? checked : undefined}
      onClick={onClick}
    >
      <span className="tools-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tools-row-label">{label}</span>
      {isSwitch && (
        <span className={`tools-row-state ${checked ? 'is-on' : ''}`} aria-hidden="true" />
      )}
      {trailing && <span className="tools-row-trailing">{trailing}</span>}
    </button>
  );
}
