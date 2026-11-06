import type { Promotion } from '../models/promotion';
import { applyFixedDiscount } from './discount';

export interface PromotionOutcome {
  /** Amount taken off the subtotal, in minor units (never above the subtotal). */
  readonly discountMinor: number;
  /** True when the promotion waives the shipping fee instead of discounting the subtotal. */
  readonly freeShipping: boolean;
}

/**
 * Money effect of a promotion on an order subtotal. Eligibility (dates, tiers,
 * minimum subtotal, usage limit) is decided before, in `promotions/promotion-rules`.
 */
export function promotionOutcome(subtotalMinor: number, promotion: Pick<Promotion, 'kind' | 'value'>): PromotionOutcome {
  switch (promotion.kind) {
    case 'percent':
      return { discountMinor: subtotalMinor * promotion.value / 100, freeShipping: false };
    case 'fixed':
      return { discountMinor: subtotalMinor - applyFixedDiscount(subtotalMinor, promotion.value), freeShipping: false };
    case 'free_shipping':
      return { discountMinor: 0, freeShipping: true };
  }
}

/** Human label of the promotion value: "15 %", a fixed amount in minor units, or free shipping. */
export function promotionValueLabel(promotion: Pick<Promotion, 'kind' | 'value'>): { readonly kind: Promotion['kind']; readonly value: number } {
  return { kind: promotion.kind, value: promotion.kind === 'free_shipping' ? 0 : promotion.value };
}
