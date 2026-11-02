import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoWeek, isWithinDays, parseIsoDate, toDateKey } from './dates';

describe('dates', () => {
  const base = new Date('2026-03-15T10:30:00.000Z');

  it('adds days', () => {
    expect(toDateKey(addDays(base, 2))).toBe('2026-03-17');
    expect(toDateKey(addDays(base, -15))).toBe('2026-02-28');
  });

  it('computes whole days between dates ignoring time of day', () => {
    expect(daysBetween(base, new Date('2026-03-16T01:00:00.000Z'))).toBe(1);
    expect(daysBetween(base, new Date('2026-03-15T23:59:59.000Z'))).toBe(0);
  });

  it('checks a date is within a window', () => {
    expect(isWithinDays(new Date('2026-03-01T00:00:00Z'), 14, base)).toBe(true);
    expect(isWithinDays(new Date('2026-02-01T00:00:00Z'), 14, base)).toBe(false);
    expect(isWithinDays(new Date('2026-04-01T00:00:00Z'), 14, base)).toBe(false);
  });

  it('computes ISO weeks', () => {
    expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2024-12-30T00:00:00Z'))).toBe(1);
    expect(isoWeek(base)).toBe(11);
  });

  it('parses ISO dates leniently', () => {
    expect(parseIsoDate('2026-03-15')?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    expect(parseIsoDate('not a date')).toBeNull();
  });
});
