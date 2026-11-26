import { useEffect, useState } from 'react';
import { screenWakeLock } from '../../../services/screen/wakeLock';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

/** After this long without a new card, a touch or a key, the screen may sleep again. */
export const SCREEN_IDLE_MS = 10 * 60_000;

/**
 * Keeps the screen on while reading or listening, if the setting is on (0.22).
 * Listening never counts as idle; a phone left on the table does.
 */
export function useKeepScreenOn(isSpeaking: boolean): void {
  const keepScreenOn = useSettingsStore((s) => s.keepScreenOn);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), SCREEN_IDLE_MS);
    const onActivity = () => {
      window.clearTimeout(timer);
      setIdle(false);
      timer = window.setTimeout(() => setIdle(true), SCREEN_IDLE_MS);
    };
    document.addEventListener('pointerdown', onActivity);
    document.addEventListener('keydown', onActivity);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity);
      // A new card is activity too: the next run of this effect starts awake.
      setIdle(false);
    };
  }, [currentIndex]);

  const wanted = keepScreenOn && (isSpeaking || !idle);
  useEffect(() => {
    screenWakeLock().setWanted(wanted);
  }, [wanted]);

  useEffect(() => () => screenWakeLock().setWanted(false), []);
}
