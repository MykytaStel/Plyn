import type { ReadingPace } from '../models/types';
import { CALM_WORDS_PER_MINUTE } from './readingStats';

export const PACE_MIN_SAMPLES = 20;
export const PACE_MIN_DWELL_MS = 1500;
export const PACE_ALPHA = 0.15;
export const PACE_MIN_WPM = 60;
export const PACE_MAX_WPM = 600;

const clampWpm = (wpm: number) => Math.min(PACE_MAX_WPM, Math.max(PACE_MIN_WPM, wpm));

/**
 * Folds one card's dwell time into the running reading pace (EMA).
 * Returns undefined when the sample is unusable (no words, too short).
 * A very long dwell (a pause) is capped at 3x the time expected at the current pace.
 */
export function updatePace(
  prev: ReadingPace | undefined,
  sample: { words: number; ms: number }
): ReadingPace | undefined {
  if (sample.words <= 0 || sample.ms < PACE_MIN_DWELL_MS) return undefined;
  const base = prev?.wordsPerMinute ?? CALM_WORDS_PER_MINUTE;
  const expectedMs = (sample.words / base) * 60_000;
  const ms = Math.min(sample.ms, 3 * expectedMs);
  const wpm = clampWpm((sample.words / ms) * 60_000);
  if (!prev) return { wordsPerMinute: wpm, samples: 1 };
  return {
    wordsPerMinute: prev.wordsPerMinute * (1 - PACE_ALPHA) + wpm * PACE_ALPHA,
    samples: prev.samples + 1,
  };
}

/** The pace to estimate with: learned once there are enough samples, calm default otherwise. */
export function effectiveWordsPerMinute(pace: ReadingPace | undefined): number {
  if (!pace || pace.samples < PACE_MIN_SAMPLES) return CALM_WORDS_PER_MINUTE;
  return clampWpm(pace.wordsPerMinute);
}
