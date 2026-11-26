import { useEffect, useState } from 'react';
import { currentI18n } from '../../../i18n';
import { useReaderStore } from '../../../store/useReaderStore';
import type { ShowToast } from './useReaderToast';

/** "~N min" for the header while a focus timer runs; a calm toast when it ends. */
export function useFocusTimer(showToast: ShowToast): string {
  const timerEndsAt = useReaderStore((s) => s.timerEndsAt);
  const completeFocusTimer = useReaderStore((s) => s.completeFocusTimer);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!timerEndsAt) {
      setLabel('');
      return;
    }
    const tick = () => {
      const remainingMs = timerEndsAt - Date.now();
      const i18n = currentI18n();
      if (remainingMs <= 0) {
        void completeFocusTimer();
        setLabel('');
        showToast(i18n.m.reader.toasts.timerDone);
        return;
      }
      const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
      setLabel(i18n.format(i18n.m.common.minutesApprox, { minutes }));
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [timerEndsAt, completeFocusTimer, showToast]);

  return label;
}
