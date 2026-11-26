import { useEffect, useRef, useState } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Which element opened each open dialog, so a sheet opened from another sheet returns past it. */
const openers = new WeakMap<Element, HTMLElement>();

function findOpener(): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  const parentDialog = active.closest('[role="dialog"]');
  return (parentDialog && openers.get(parentDialog)) || active;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[hidden], [inert]')
  );
}

/**
 * Focus for a modal sheet (0.22): moves into the dialog when it opens (unless
 * an `autoFocus` field already took it), keeps Tab inside, and goes back to
 * the element that had it, usually the button that opened the sheet.
 */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // Read on the first render, before an autoFocus field inside takes focus.
  const [opener] = useState(findOpener);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (opener) openers.set(dialog, opener);

    if (!dialog.contains(document.activeElement)) {
      const first = focusables(dialog)[0];
      if (first) first.focus({ preventScroll: true });
      else {
        dialog.tabIndex = -1;
        dialog.focus({ preventScroll: true });
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables(dialog);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [opener]);

  return ref;
}
