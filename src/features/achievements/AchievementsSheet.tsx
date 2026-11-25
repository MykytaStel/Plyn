import { CheckCircle2, X } from 'lucide-react';
import {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS_STATS
} from '../../core/achievements/achievements';
import type { UserProgressStats } from '../../core/models/types';

interface AchievementsSheetProps {
  stats: UserProgressStats | undefined;
  onClose: () => void;
}

export function AchievementsSheet({ stats, onClose }: AchievementsSheetProps) {
  const safeStats = stats ?? DEFAULT_PROGRESS_STATS;
  const unlockedSet = new Set(safeStats.unlockedIds);

  return (
    <aside
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="achievements-title">Прогрес і нагороди</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label="Закрити нагороди"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="stats-summary-grid">
        <div className="stat-tile">
          <span className="stat-value">{safeStats.totalCardsRead}</span>
          <span className="stat-label">Карток прочитано</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{safeStats.totalDocsCompleted}</span>
          <span className="stat-label">Текстів завершено</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">
            {unlockedSet.size} / {ACHIEVEMENTS.length}
          </span>
          <span className="stat-label">Нагород</span>
        </div>
      </div>

      <div className="achievements-list">
        {ACHIEVEMENTS.map((def) => {
          const isUnlocked = unlockedSet.has(def.id);
          const progress = Math.min(def.target, def.getProgress(safeStats));
          const pct = Math.round((progress / def.target) * 100);

          return (
            <div
              key={def.id}
              className={`achievement-card ${isUnlocked ? 'is-unlocked' : ''}`}
            >
              <div className="achievement-top">
                <div>
                  <div className="achievement-title">{def.title}</div>
                  <p className="achievement-desc">{def.description}</p>
                </div>
                <span className="achievement-status">
                  {isUnlocked ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    `${progress} / ${def.target}`
                  )}
                </span>
              </div>
              <div className="library-progress-bar">
                <div
                  className="library-progress-fill"
                  style={{ width: `${isUnlocked ? 100 : pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
