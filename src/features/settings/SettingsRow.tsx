import { ChevronRight } from 'lucide-react';
import type { Ref } from 'react';

interface SettingsRowProps {
  title: string;
  summary: string;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * One row of the Settings first screen: the section title, a one-line summary
 * of what is set inside (cut with an ellipsis on narrow screens; the full
 * text stays in the accessible name, which is the visible text), and a chevron.
 */
export function SettingsRow({ title, summary, onOpen, ref }: SettingsRowProps) {
  return (
    <button
      ref={ref}
      type="button"
      className="settings-row"
      onClick={onOpen}
    >
      <span className="settings-row-text">
        <span className="settings-row-title">
          {title}
          {/* The name reads "Title, summary"; the comma is for screen readers only. */}
          {summary && <span className="sr-only">,</span>}
        </span>
        {/* A flex container drops this space visually; names keep it. */}
        {summary && ' '}
        {summary && <span className="settings-row-summary">{summary}</span>}
      </span>
      <ChevronRight size={18} className="settings-row-chevron" aria-hidden="true" />
    </button>
  );
}
