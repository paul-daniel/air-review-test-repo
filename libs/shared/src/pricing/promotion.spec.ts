import { describe, expect, it } from 'vitest';
import { promotionOutcome } from './promotion';

describe('promotionOutcome', () => {
  it('takes a percentage off the subtotal', () => {
    expect(promotionOutcome(10_000, { kind: 'percent', value: 10 })).toEqual({ discountMinor: 1000, freeShipping: false });
  });

  it('takes a fixed amount off, never more than the subtotal', () => {
    expect(promotionOutcome(2500, { kind: 'fixed', value: 500 })).toEqual({ discountMinor: 500, freeShipping: false });
    expect(promotionOutcome(300, { kind: 'fixed', value: 500 })).toEqual({ discountMinor: 300, freeShipping: false });
  });

  it('waives shipping without touching the subtotal', () => {
    expect(promotionOutcome(2500, { kind: 'free_shipping', value: 0 })).toEqual({ discountMinor: 0, freeShipping: true });
  });
});
