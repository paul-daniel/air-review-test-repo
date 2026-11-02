const DAY_MS = 24 * 60 * 60 * 1000;

export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function isWithinDays(date: Date, days: number, reference: Date = new Date()): boolean {
  const diff = daysBetween(date, reference);
  return diff >= 0 && diff <= days;
}

/** Returns `YYYY-MM-DD` in UTC; used for grouping KPIs by day. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns the ISO-8601 week number (1-53) in UTC. */
export function isoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

export function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
