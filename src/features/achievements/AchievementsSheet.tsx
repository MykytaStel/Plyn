import { CheckCircle2, X } from 'lucide-react';
import {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS_STATS
} from '../../core/achievements/achievements';
import type { UserProgressStats } from '../../core/models/types';
import { buildLast7DaysActivity } from '../../core/reading/weeklyActivity';
import { formatWeekdayShort, useI18n } from '../../i18n';

interface AchievementsSheetProps {
  stats: UserProgressStats | undefined;
  onClose: () => void;
}

export function AchievementsSheet({ stats, onClose }: AchievementsSheetProps) {
  const i18n = useI18n();
  const t = i18n.m.achievementsSheet;
  const safeStats = stats ?? DEFAULT_PROGRESS_STATS;
  const unlockedSet = new Set(safeStats.unlockedIds);
  const { days, weeklyTotal, maxDay } = buildLast7DaysActivity(
    safeStats.dailyCardsRead
  );

  return (
    <aside
      className="bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-header">
        <h2 id="achievements-title">{t.title}</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label={t.close}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="stats-summary-grid">
        <div className="stat-tile">
          <span className="stat-value">{i18n.number(safeStats.totalCardsRead)}</span>
          <span className="stat-label">{t.totalCards}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{i18n.number(safeStats.totalDocsCompleted)}</span>
          <span className="stat-label">{t.docsCompleted}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">
            {unlockedSet.size} / {ACHIEVEMENTS.length}
          </span>
          <span className="stat-label">{t.rewards}</span>
        </div>
      </div>

      {/* Спокійний 7-денний ритм без штрафних стріків */}
      <div className="weekly-card">
        <div className="weekly-header">
          <span>{t.last7Days}</span>
          <span className="weekly-total">
            {i18n.plural(i18n.m.common.cards, weeklyTotal)}
          </span>
        </div>
        <div className="weekly-bars" aria-label={t.activityLabel}>
          {days.map((day) => {
            const heightPct =
              day.cardsRead === 0
                ? 8
                : Math.max(18, Math.round((day.cardsRead / maxDay) * 100));
            const weekday = formatWeekdayShort(day.date, i18n.locale);
            return (
              <div
                key={day.dateKey}
                className={`weekly-col ${day.isToday ? 'is-today' : ''}`}
                title={`${weekday}: ${i18n.plural(i18n.m.common.cards, day.cardsRead)}`}
              >
                <div className="weekly-bar-track">
                  <div
                    className={`weekly-bar-fill ${day.cardsRead > 0 ? 'has-value' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="weekly-day-label">{weekday}</span>
              </div>
            );
          })}
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
                  <div className="achievement-title">
                    {i18n.m.achievements[def.id].title}
                  </div>
                  <p className="achievement-desc">
                    {i18n.m.achievements[def.id].description}
                  </p>
                </div>
                <span className="achievement-status">
                  {isUnlocked ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    `${i18n.number(progress)} / ${i18n.number(def.target)}`
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
