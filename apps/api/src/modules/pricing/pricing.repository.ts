import type { CustomerTier } from '@atlas/shared';

export interface PromoRule {
  readonly code: string;
  readonly percent: number;
  readonly minSubtotalMinor: number;
  readonly validUntil: string;
  readonly active: boolean;
}

/** Tier discounts and promo codes. In-memory for now; would be a table in production. */
export class PricingRulesRepository {
  private readonly tierDiscounts: Readonly<Record<CustomerTier, number>>;
  private readonly promos = new Map<string, PromoRule>();

  constructor(
    tierDiscounts: Readonly<Record<CustomerTier, number>> = { standard: 0, silver: 3, gold: 5, platinum: 8 },
    promos: readonly PromoRule[] = seedPromos(),
  ) {
    this.tierDiscounts = tierDiscounts;
    for (const promo of promos) {
      this.promos.set(promo.code, promo);
    }
  }

  tierDiscountPercent(tier: CustomerTier): number {
    return this.tierDiscounts[tier];
  }

  findPromo(code: string): PromoRule | undefined {
    return this.promos.get(code.toUpperCase());
  }

  savePromo(rule: PromoRule): PromoRule {
    this.promos.set(rule.code.toUpperCase(), rule);
    return rule;
  }
}

export function seedPromos(): PromoRule[] {
  return [
    { code: 'WELCOME10', percent: 10, minSubtotalMinor: 3000, validUntil: '2027-12-31T23:59:59.000Z', active: true },
    { code: 'SUMMER15', percent: 15, minSubtotalMinor: 10_000, validUntil: '2026-08-31T23:59:59.000Z', active: true },
    { code: 'OLDCODE', percent: 20, minSubtotalMinor: 0, validUntil: '2025-01-01T00:00:00.000Z', active: false },
  ];
}
