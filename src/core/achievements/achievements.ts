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
    title: 'Перший крок',
    description: 'Дочитати перший текст до кінця',
    target: 1,
    getProgress: (s) => s.totalDocsCompleted
  },
  {
    id: 'rhythm_50',
    title: 'У ритмі',
    description: 'Прочитати 50 карток сумарно',
    target: 50,
    getProgress: (s) => s.totalCardsRead
  },
  {
    id: 'anchor_25',
    title: 'Свій якір',
    description: 'Прочитати 25 карток у режимі «Якір»',
    target: 25,
    getProgress: (s) => s.anchorCardsRead
  },
  {
    id: 'thought_hunter',
    title: 'Мисливець за думками',
    description: 'Зберегти 5 закладок у текстах',
    target: 5,
    getProgress: (s) => s.totalBookmarksCreated
  },
  {
    id: 'no_rush',
    title: 'Без поспіху',
    description: 'Завершити сесію з м’яким таймером фокусу',
    target: 1,
    getProgress: (s) => s.timerSessionsCompleted
  },
  {
    id: 'bookworm_3',
    title: 'Власна полиця',
    description: 'Дочитати 3 тексти до кінця',
    target: 3,
    getProgress: (s) => s.totalDocsCompleted
  },
  {
    id: 'rhythm_250',
    title: 'Спокійний темп',
    description: 'Прочитати 250 карток сумарно',
    target: 250,
    getProgress: (s) => s.totalCardsRead
  },
  {
    id: 'rhythm_1000',
    title: 'Глибокий фокус',
    description: 'Прочитати 1 000 карток сумарно',
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
