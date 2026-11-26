import { useEffect, useRef } from 'react';
import { readerToggleFor, type ReaderToggle } from '../shortcuts';

export interface ReaderKeyboardActions {
  /** A sheet is open: only Escape is handled here, the sheet has the keys. */
  sheetOpen: boolean;
  onEscape: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggle: (toggle: ReaderToggle) => void;
}

/**
 * Space / arrows / j / k move, Escape steps back one layer, single-letter
 * toggles come from shortcuts.ts (physical keys, any layout).
 */
export function useReaderKeyboard(actions: ReaderKeyboardActions): void {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const a = latest.current;
      if (e.key === 'Escape') {
        a.onEscape();
        return;
      }
      if (a.sheetOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) a.onPrev();
        else a.onNext();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        a.onNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        a.onPrev();
      } else {
        const toggle = readerToggleFor(e);
        if (!toggle) return;
        e.preventDefault();
        a.onToggle(toggle);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
