import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef } from 'react';
import type { ReadingCard } from '../../../core/models/types';
import { effectiveWordsPerMinute, PACE_MIN_DWELL_MS } from '../../../core/reading/pace';
import { cumulativeWords } from '../../../core/reading/timeLeft';
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
 * time in a hidden tab does not count. Returns the pace to estimate with.
 */
export function useReadingPace({
  cards,
  currentIndex,
  isSpeaking
}: {
  cards: ReadingCard[];
  currentIndex: number;
  isSpeaking: boolean;
}): number {
  const prefix = useMemo(() => cumulativeWords(cards), [cards]);
  const wpm = useEffectiveWpm();
  const startRef = useRef<number | null>(now());
  const prevRef = useRef({ index: currentIndex, cards });
  const speakingRef = useRef(isSpeaking);

  useEffect(() => {
    speakingRef.current = isSpeaking;
    // Speech starting or ending is not reading: begin a fresh dwell.
    startRef.current = document.visibilityState === 'visible' ? now() : null;
  }, [isSpeaking]);

  useEffect(() => {
    const onVisibility = () => {
      startRef.current = document.visibilityState === 'visible' ? now() : null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { index: currentIndex, cards };
    if (prev.cards !== cards || prev.index === currentIndex) return;
    const started = startRef.current;
    startRef.current = document.visibilityState === 'visible' ? now() : null;
    if (started === null || speakingRef.current) return;
    const words = prefix[prev.index + 1] - prefix[prev.index];
    const ms = now() - started;
    if (Number.isFinite(words) && words > 0 && ms >= PACE_MIN_DWELL_MS) {
      void recordProgressDelta({ paceSample: { words, ms } });
    }
  }, [currentIndex, cards, prefix]);

  return wpm;
}
