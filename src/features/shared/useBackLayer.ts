import { useEffect, useRef } from 'react';
import { appBackStack } from '../../services/navigation/appBackStack';

/**
 * While `open`, this layer owns one history entry: back (Android, browser,
 * iOS swipe) calls `onBack` instead of leaving the page. Closing the layer
 * any other way removes the entry again.
 */
export function useBackLayer(open: boolean, onBack: () => void): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });

  useEffect(() => {
    if (!open) return;
    const stack = appBackStack();
    const token = stack.push(() => latest.current());
    return () => stack.release(token);
  }, [open]);
}
