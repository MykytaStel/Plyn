import { useEffect, useRef } from 'react';

interface UndoToastProps {
  message: string;
  undoLabel: string;
  onUndo: () => void;
  onExpire: () => void;
  /** How long Undo stays available. */
  durationMs?: number;
  /** Move focus to the action on show. Default true; off for calm notices. */
  focusAction?: boolean;
}

/**
 * "Text deleted · Undo" at the bottom of the screen. Focus moves to Undo so
 * keyboard and screen reader users can reach it before it disappears.
 */
export function UndoToast({
  message,
  undoLabel,
  onUndo,
  onExpire,
  durationMs = 6000,
  focusAction = true
}: UndoToastProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (focusAction) buttonRef.current?.focus();
    const timer = window.setTimeout(() => onExpireRef.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, focusAction]);

  return (
    <div className="undo-toast" role="status">
      <span>{message}</span>
      <button ref={buttonRef} type="button" className="undo-toast-btn" onClick={onUndo}>
        {undoLabel}
      </button>
    </div>
  );
}
