export interface DayActivity {
  dateKey: string;
  /** Noon local time of that day; the UI formats the weekday. */
  date: Date;
  cardsRead: number;
  isToday: boolean;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Повертає спокійний огляд прочитаних карток за останні 7 днів (без штрафних стріків).
 */
export function buildLast7DaysActivity(
  dailyMap: Record<string, number> = {},
  referenceDate = new Date()
): { days: DayActivity[]; weeklyTotal: number; maxDay: number } {
  const days: DayActivity[] = [];
  let weeklyTotal = 0;
  let maxDay = 1;

  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(referenceDate);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - offset);

    const key = toLocalDateKey(d);
    const count = Math.max(0, dailyMap[key] || 0);
    weeklyTotal += count;
    if (count > maxDay) maxDay = count;

    days.push({
      dateKey: key,
      date: d,
      cardsRead: count,
      isToday: offset === 0
    });
  }

  return { days, weeklyTotal, maxDay };
}
