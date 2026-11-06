import { describe, expect, it } from 'vitest';
import type { Promotion } from '../models/promotion';
import { checkPromotion, remainingUses } from './promotion-rules';

const base: Promotion = {
  id: 'prm_1',
  code: 'SPRING15',
  name: 'Spring sale',
  kind: 'percent',
  value: 15,
  minSubtotalMinor: 5000,
  tiers: [],
  startsAt: '2026-03-01T00:00:00.000Z',
  endsAt: '2026-03-31T23:59:59.000Z',
  archived: false,
  usageLimit: 100,
  usageCount: 10,
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};
const live = { subtotalMinor: 8000, customerTier: 'standard', nowIso: '2026-03-15T12:00:00.000Z' };

describe('checkPromotion', () => {
  it('applies to a live promotion above the minimum', () => {
    expect(checkPromotion(base, live)).toEqual({ applies: true });
  });

  it('rejects by status, then usage, then tier, then minimum', () => {
    expect(checkPromotion(base, { ...live, nowIso: '2026-04-02T00:00:00.000Z' }).reason).toBe('not_live');
    expect(checkPromotion({ ...base, usageCount: 100 }, live).reason).toBe('usage_limit_reached');
    expect(checkPromotion({ ...base, tiers: ['gold'] }, live).reason).toBe('tier_not_eligible');
    expect(checkPromotion(base, { ...live, subtotalMinor: 4999 }).reason).toBe('below_minimum');
  });

  it('counts remaining uses', () => {
    expect(remainingUses(base)).toBe(90);
    expect(remainingUses({ usageLimit: null, usageCount: 5 })).toBeNull();
    expect(remainingUses({ usageLimit: 3, usageCount: 7 })).toBe(0);
  });
});
