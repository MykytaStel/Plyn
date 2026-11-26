import type {
  AchievementDefinition,
  UserProgressStats
} from '../models/types';

export const DEFAULT_PROGRESS_STATS: UserProgressStats = {
  id: 'main',
  totalCardsRead: 0,
  totalDocsCompleted: 0,
  anchorCardsRead: 0,
  totalBookmarksCreated: 0,
  timerSessionsCompleted: 0,
  ttsCardsListened: 0,
  zenModeUsed: 0,
  unlockedIds: [],
  unlockedAt: {},
  updatedAt: 0
};

/**
 * Спокійні накопичувальні ачівменти без агресивних стріків і почуття провини.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_step',
    target: 1,
    getProgress: (s) => s.totalDocsCompleted
  },
  {
    id: 'rhythm_50',
    target: 50,
    getProgress: (s) => s.totalCardsRead
  },
  {
    id: 'anchor_25',
    target: 25,
    getProgress: (s) => s.anchorCardsRead
  },
  {
    id: 'zen_reader',
    target: 1,
    getProgress: (s) => s.zenModeUsed ?? 0
  },
  {
    id: 'audio_listener',
    target: 5,
    getProgress: (s) => s.ttsCardsListened ?? 0
  },
  {
    id: 'thought_hunter',
    target: 5,
    getProgress: (s) => s.totalBookmarksCreated
  },
  {
    id: 'no_rush',
    target: 1,
    getProgress: (s) => s.timerSessionsCompleted
  },
  {
    id: 'bookworm_3',
    target: 3,
    getProgress: (s) => s.totalDocsCompleted
  },
  {
    id: 'rhythm_250',
    target: 250,
    getProgress: (s) => s.totalCardsRead
  },
  {
    id: 'rhythm_1000',
    target: 1000,
    getProgress: (s) => s.totalCardsRead
  }
];

/**
 * Перевіряє, які нові ачівменти щойно відкрилися, і повертає оновлену статистику
 * разом зі списком щойно розблокованих нагород.
 */
export function evaluateAchievements(
  stats: UserProgressStats,
  now = Date.now()
): {
  nextStats: UserProgressStats;
  newlyUnlocked: AchievementDefinition[];
} {
  const unlockedSet = new Set(stats.unlockedIds);
  const unlockedAt = { ...stats.unlockedAt };
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const def of ACHIEVEMENTS) {
    if (unlockedSet.has(def.id)) continue;
    if (def.getProgress(stats) >= def.target) {
      unlockedSet.add(def.id);
      unlockedAt[def.id] = now;
      newlyUnlocked.push(def);
    }
  }

  return {
    nextStats: {
      ...stats,
      unlockedIds: [...unlockedSet],
      unlockedAt,
      updatedAt: now
    },
    newlyUnlocked
  };
}
