export interface DailyPoint {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface Bucket {
  label: string;
  count: number;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

/** The most recent `days` individual days as bars — showing all 365 available days at once
 *  would make the chart unreadable, so "Day" view is a recent window, not the full year. */
export function groupByDay(daily: DailyPoint[], days = 14): Bucket[] {
  return daily.slice(-days).map((d) => ({ label: DAY_LABEL.format(parseDateKey(d.date)), count: d.count }));
}

/** Groups into Mon–Sun weeks, labeled by the Monday of each week, showing the most recent `weeks`. */
export function groupByWeek(daily: DailyPoint[], weeks = 12): Bucket[] {
  const buckets = new Map<string, number>();
  for (const point of daily) {
    const date = parseDateKey(point.date);
    const diffToMonday = (date.getDay() + 6) % 7; // days since the most recent Monday (0 = Sun)
    const monday = new Date(date);
    monday.setDate(date.getDate() - diffToMonday);
    const key = monday.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + point.count);
  }
  return [...buckets.keys()]
    .sort()
    .slice(-weeks)
    .map((key) => ({ label: DAY_LABEL.format(parseDateKey(key)), count: buckets.get(key) as number }));
}

/** Groups into calendar months (e.g. "Jul 2026"), showing the most recent `months`. */
export function groupByMonth(daily: DailyPoint[], months = 12): Bucket[] {
  const buckets = new Map<string, number>();
  for (const point of daily) {
    const key = point.date.slice(0, 7); // "YYYY-MM"
    buckets.set(key, (buckets.get(key) ?? 0) + point.count);
  }
  return [...buckets.keys()]
    .sort()
    .slice(-months)
    .map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { label: MONTH_LABEL.format(new Date(y, m - 1, 1)), count: buckets.get(key) as number };
    });
}
