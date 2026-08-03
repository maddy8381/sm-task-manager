/**
 * All dates here are treated as pure calendar dates (year/month/day), stored
 * as UTC-midnight `Date` objects. We deliberately avoid the server process's
 * local timezone (Vercel runs in UTC, a laptop might not) — "today" always
 * comes from the client's browser and travels through the system as a
 * `yyyy-MM-dd` string, so day boundaries match the user's real midnight.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fromCalendarDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

/** Parse a `yyyy-MM-dd` string into a UTC-midnight calendar date. */
export function parseCalendarDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid calendar date: ${value}`);
  return fromCalendarDate(y, m, d);
}

export function toCalendarDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysUTC(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

/** Monday of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = (dayOfWeek + 6) % 7; // Mon -> 0, Tue -> 1, ... Sun -> 6
  return addDaysUTC(date, -diffToMonday);
}

export function getDaysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));
}

/** Days of the week, with today pinned first (falls back to plain Mon->Sun order if `today` isn't in this week). */
export function getDaysOrderedForCurrentWeek(weekStart: Date, today: Date): Date[] {
  const days = getDaysOfWeek(weekStart);
  const todayKey = toCalendarDateString(today);
  const todayIndex = days.findIndex((d) => toCalendarDateString(d) === todayKey);
  if (todayIndex === -1) return days;
  return [days[todayIndex], ...days.slice(0, todayIndex), ...days.slice(todayIndex + 1)];
}

export function formatDayHeading(date: Date): string {
  return `${WEEKDAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function formatShortDay(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDaysUTC(weekStart, 6);
  const sameYear = weekStart.getUTCFullYear() === weekEnd.getUTCFullYear();
  const start = sameYear
    ? formatShortDay(weekStart)
    : `${formatShortDay(weekStart)}, ${weekStart.getUTCFullYear()}`;
  const end = `${formatShortDay(weekEnd)}, ${weekEnd.getUTCFullYear()}`;
  return `${start} – ${end}`;
}

export function isSameCalendarDate(a: Date, b: Date): boolean {
  return toCalendarDateString(a) === toCalendarDateString(b);
}

/** The user's real "today" as seen in their browser's local timezone. Client-side only. */
export function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
