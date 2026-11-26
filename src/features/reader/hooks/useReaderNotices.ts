import { useEffect, useRef } from 'react';
import { currentI18n } from '../../../i18n';
import { useReaderStore } from '../../../store/useReaderStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import type { ShowToast } from './useReaderToast';

const EYE_BREAK_INTERVAL = 25;

/**
 * Gentle messages that come from reading itself: a new award, a reached
 * micro-goal and the optional 20-20-20 eye-break reminder every 25 cards.
 */
export function useReaderNotices(showToast: ShowToast): void {
  const activeDocId = useReaderStore((s) => s.activeDoc?.id);
  const currentIndex = useReaderStore((s) => s.currentIndex);
  const recentUnlocks = useReaderStore((s) => s.recentUnlocks);
  const shiftRecentUnlock = useReaderStore((s) => s.shiftRecentUnlock);
  const microGoalTarget = useReaderStore((s) => s.microGoalTarget);
  const microGoalCompleted = useReaderStore((s) => s.microGoalCompleted);
  const eyeBreakReminder = useSettingsStore((s) => s.eyeBreakReminder);

  const microGoalNotifiedRef = useRef(false);
  const sessionCardsSeenRef = useRef(new Set<number>());

  useEffect(() => {
    if (recentUnlocks.length === 0) return;
    const i18n = currentI18n();
    const next = recentUnlocks[0];
    showToast(
      i18n.format(i18n.m.reader.toasts.newReward, { title: i18n.m.achievements[next.id].title }),
      true
    );
    shiftRecentUnlock();
  }, [recentUnlocks, shiftRecentUnlock, showToast]);

  useEffect(() => {
    if (microGoalTarget && microGoalCompleted && !microGoalNotifiedRef.current) {
      microGoalNotifiedRef.current = true;
      const i18n = currentI18n();
      showToast(i18n.plural(i18n.m.reader.toasts.goalReached, microGoalTarget), true);
    }
    if (!microGoalTarget) microGoalNotifiedRef.current = false;
  }, [microGoalTarget, microGoalCompleted, showToast]);

  useEffect(() => {
    sessionCardsSeenRef.current.clear();
  }, [activeDocId]);

  useEffect(() => {
    if (!eyeBreakReminder) return;
    sessionCardsSeenRef.current.add(currentIndex);
    const count = sessionCardsSeenRef.current.size;
    if (count > 1 && count % EYE_BREAK_INTERVAL === 0) {
      showToast(currentI18n().m.reader.toasts.eyeBreak, true);
    }
  }, [currentIndex, eyeBreakReminder, showToast]);
}
