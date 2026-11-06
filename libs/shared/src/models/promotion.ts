export const PROMOTION_KINDS = ['percent', 'fixed', 'free_shipping'] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

export const PROMOTION_STATUSES = ['draft', 'scheduled', 'live', 'expired', 'archived'] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export interface Promotion {
  readonly id: string;
  /** Upper-case code typed by the customer, unique. */
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  /** Human percentage for `percent` (15 means 15 %), minor units for `fixed`, 0 for `free_shipping`. */
  readonly value: number;
  readonly minSubtotalMinor: number;
  /** Customer tiers allowed to use the code; empty means everyone. */
  readonly tiers: readonly string[];
  readonly startsAt: string;
  readonly endsAt: string;
  readonly archived: boolean;
  readonly usageLimit: number | null;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PromotionSummary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  readonly value: number;
  readonly status: PromotionStatus;
  readonly usageCount: number;
  readonly usageLimit: number | null;
  readonly endsAt: string;
}

export function isPromotionKind(value: string): value is PromotionKind {
  return (PROMOTION_KINDS as readonly string[]).includes(value);
}

/** Lifecycle status derived from the dates and the archive flag; never stored. */
export function promotionStatus(promotion: Pick<Promotion, 'startsAt' | 'endsAt' | 'archived'>, nowIso: string): PromotionStatus {
  if (promotion.archived) return 'archived';
  if (nowIso < promotion.startsAt) return 'scheduled';
  if (nowIso > promotion.endsAt) return 'expired';
  return 'live';
}

export function normalizePromotionCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}
