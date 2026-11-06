import type { Promotion } from '../models/promotion';
import { promotionStatus } from '../models/promotion';

export type PromotionRejection =
  | 'not_live'
  | 'below_minimum'
  | 'tier_not_eligible'
  | 'usage_limit_reached';

export interface PromotionContext {
  readonly subtotalMinor: number;
  readonly customerTier: string;
  readonly nowIso: string;
}

export interface PromotionCheck {
  readonly applies: boolean;
  readonly reason?: PromotionRejection;
}

/** Why a promotion does or does not apply to an order, in a fixed order of checks. */
export function checkPromotion(promotion: Promotion, context: PromotionContext): PromotionCheck {
  if (promotionStatus(promotion, context.nowIso) !== 'live') return { applies: false, reason: 'not_live' };
  if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) {
    return { applies: false, reason: 'usage_limit_reached' };
  }
  if (promotion.tiers.length > 0 && !promotion.tiers.includes(context.customerTier)) {
    return { applies: false, reason: 'tier_not_eligible' };
  }
  if (context.subtotalMinor < promotion.minSubtotalMinor) return { applies: false, reason: 'below_minimum' };
  return { applies: true };
}

/** Remaining uses, or null when unlimited. */
export function remainingUses(promotion: Pick<Promotion, 'usageLimit' | 'usageCount'>): number | null {
  return promotion.usageLimit === null ? null : Math.max(0, promotion.usageLimit - promotion.usageCount);
}
