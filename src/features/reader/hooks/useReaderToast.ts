import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReaderToast {
  text: string;
  isAchievement?: boolean;
}

export type ShowToast = (text: string, isAchievement?: boolean) => void;

/** One short message at a time; awards stay a little longer. */
export function useReaderToast(): { toast: ReaderToast | null; showToast: ShowToast } {
  const [toast, setToast] = useState<ReaderToast | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const showToast = useCallback<ShowToast>((text, isAchievement = false) => {
    setToast({ text, isAchievement });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), isAchievement ? 4200 : 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { toast, showToast };
}
