import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESS_STATS,
  evaluateAchievements
} from './achievements';

describe('evaluateAchievements', () => {
  it('unlocks matching achievements once and never duplicates them', () => {
    const firstPass = evaluateAchievements(
      {
        ...DEFAULT_PROGRESS_STATS,
        totalDocsCompleted: 1,
        totalCardsRead: 52,
        anchorCardsRead: 25
      },
      1000
    );

    const unlockedIds = firstPass.newlyUnlocked.map((a) => a.id);
    expect(unlockedIds).toEqual(['first_step', 'rhythm_50', 'anchor_25']);
    expect(firstPass.nextStats.unlockedIds).toContain('first_step');

    // Повторна перевірка не повинна видавати дублікати
    const secondPass = evaluateAchievements(firstPass.nextStats, 2000);
    expect(secondPass.newlyUnlocked).toHaveLength(0);
  });

  it('unlocks timer and bookmarks achievements independently', () => {
    const res = evaluateAchievements({
      ...DEFAULT_PROGRESS_STATS,
      totalBookmarksCreated: 5,
      timerSessionsCompleted: 1
    });

    expect(res.newlyUnlocked.map((a) => a.id)).toEqual([
      'thought_hunter',
      'no_rush'
    ]);
  });
});
