import { describe, expect, it } from 'vitest';
import { formatOrderReference, parseOrderReference } from './reference';

describe('formatOrderReference', () => {
  it('pads the sequence number to six digits', () => {
    expect(formatOrderReference({ number: 1041, placedAt: '2026-04-02T14:12:00.000Z' })).toBe('ORD-2026-001041');
    expect(formatOrderReference({ number: 7, placedAt: '2025-12-31T23:59:59.000Z' })).toBe('ORD-2025-000007');
  });

  it('uses the UTC year', () => {
    expect(formatOrderReference({ number: 1, placedAt: '2026-01-01T00:30:00.000Z' })).toBe('ORD-2026-000001');
  });

  it('does not truncate numbers wider than six digits', () => {
    expect(formatOrderReference({ number: 12345678, placedAt: '2026-06-01T00:00:00.000Z' })).toBe('ORD-2026-12345678');
  });
});

describe('parseOrderReference', () => {
  it('round-trips formatted references', () => {
    expect(parseOrderReference('ORD-2026-001041')).toEqual({ year: 2026, number: 1041 });
    expect(parseOrderReference(' ord-2026-001041 ')).toEqual({ year: 2026, number: 1041 });
  });

  it('rejects malformed input', () => {
    expect(parseOrderReference('ORD-26-1')).toBeNull();
    expect(parseOrderReference('RET-2026-000001')).toBeNull();
  });
});
