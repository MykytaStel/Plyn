import { describe, expect, it } from 'vitest';
import { buildLast7DaysActivity, toLocalDateKey } from './weeklyActivity';

describe('buildLast7DaysActivity', () => {
  it('computes 7-day rolling totals cleanly without streaks pressure', () => {
    const ref = new Date('2026-11-26T12:00:00');
    const todayKey = toLocalDateKey(ref);
    const prev = new Date(ref);
    prev.setDate(prev.getDate() - 2);
    const prevKey = toLocalDateKey(prev);

    const result = buildLast7DaysActivity(
      { [todayKey]: 12, [prevKey]: 8, '2020-01-01': 99 },
      ref
    );

    expect(result.days).toHaveLength(7);
    expect(result.days[6].isToday).toBe(true);
    expect(result.days[6].cardsRead).toBe(12);
    expect(result.weeklyTotal).toBe(20);
    expect(result.maxDay).toBe(12);
  });

  it('returns dates, not localized labels', () => {
    const ref = new Date('2026-11-26T12:00:00');
    const { days } = buildLast7DaysActivity({}, ref);
    expect(toLocalDateKey(days[6].date)).toBe('2026-11-26');
    expect(toLocalDateKey(days[0].date)).toBe('2026-11-20');
    expect('label' in days[0]).toBe(false);
  });
});
