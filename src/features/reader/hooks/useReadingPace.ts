import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { effectiveWordsPerMinute, PACE_MIN_DWELL_MS } from '../../../core/reading/pace';
import { getProgressStats, recordProgressDelta } from '../../../services/storage/db';

const now = () => Date.now();

/** The pace to estimate with, live from stats: learned once there are enough samples. */
export function useEffectiveWpm(): number {
  const stats = useLiveQuery(() => getProgressStats(), []);
  return effectiveWordsPerMinute(stats?.readingPace);
}

/**
 * Samples how long the reader dwells on each card and folds it into their pace (0.27).
 * Nothing is recorded while text-to-speech reads (the time is the voice's), and
 * time in a hidden tab, in a sheet or on the Done screen (`paused`) does not count.
 * `wordPrefix` is `cumulativeWords(cards)`, memoized per document by the caller.
 * Returns the pace to estimate with.
 */
export function useReadingPace({
  wordPrefix,
  currentIndex,
  isSpeaking,
  paused
}: {
  wordPrefix: number[];
  currentIndex: number;
  isSpeaking: boolean;
  paused: boolean;
}): number {
  const wpm = useEffectiveWpm();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const restart = () =>
    document.visibilityState === 'visible' && !pausedRef.current ? now() : null;
  const startRef = useRef<number | null>(paused ? null : now());
  const prevRef = useRef({ index: currentIndex, wordPrefix });
  const speakingRef = useRef(isSpeaking);

  useEffect(() => {
    speakingRef.current = isSpeaking;
    // Speech starting or ending is not reading: begin a fresh dwell.
    startRef.current = restart();
  }, [isSpeaking]);

  useEffect(() => {
    // A sheet or the Done screen opening stops the dwell; closing it starts a fresh one.
    startRef.current = restart();
  }, [paused]);

  useEffect(() => {
    const onVisibility = () => {
      startRef.current = restart();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { index: currentIndex, wordPrefix };
    if (prev.wordPrefix !== wordPrefix) {
      // A re-split: the old dwell belongs to different cards.
      startRef.current = restart();
      return;
    }
    if (prev.index === currentIndex) return;
    const started = startRef.current;
    startRef.current = restart();
    if (started === null || speakingRef.current) return;
    const words = wordPrefix[prev.index + 1] - wordPrefix[prev.index];
    const ms = now() - started;
    if (Number.isFinite(words) && words > 0 && ms >= PACE_MIN_DWELL_MS) {
      void recordProgressDelta({ paceSample: { words, ms } });
    }
  }, [currentIndex, wordPrefix]);

  return wpm;
}
