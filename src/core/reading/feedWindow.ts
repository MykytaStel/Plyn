/**
 * Cards rendered on each side of the current one. Everything further away is
 * a spacer of the same height, so a book with 10,000 cards keeps about a
 * dozen slides in the DOM (0.25).
 */
export const FEED_WINDOW_RADIUS = 5;

/** A range of card indices, both ends inclusive; empty when `end < start`. */
export interface FeedWindow {
  start: number;
  end: number;
}

/** The cards kept in the DOM around `currentIndex`. */
export function feedWindow(
  currentIndex: number,
  total: number,
  radius = FEED_WINDOW_RADIUS
): FeedWindow {
  if (total <= 0) return { start: 0, end: -1 };
  const center = Math.min(Math.max(0, currentIndex), total - 1);
  return {
    start: Math.max(0, center - radius),
    end: Math.min(total - 1, center + radius)
  };
}

/** True when jumping to `target` lands outside the window around `currentIndex`. */
export function isOutsideFeedWindow(
  target: number,
  currentIndex: number,
  radius = FEED_WINDOW_RADIUS
): boolean {
  return Math.abs(target - currentIndex) > radius;
}
