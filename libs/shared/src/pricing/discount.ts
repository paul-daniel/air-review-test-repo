import { roundHalfAwayFromZero } from '../money';

/**
 * Applies a percentage discount to an amount expressed in minor units.
 *
 * `percent` is a human percentage (10 means 10 %). The result is rounded
 * half away from zero and never goes below zero.
 */
export function applyPercentDiscount(amountMinor: number, percent: number): number {
  assertPercent(percent);
  const discounted = roundHalfAwayFromZero(amountMinor * (1 - percent / 100));
  return Math.max(0, discounted);
}

/** Returns the discount amount (not the discounted price) for a percentage. */
export function percentDiscountAmount(amountMinor: number, percent: number): number {
  return amountMinor - applyPercentDiscount(amountMinor, percent);
}

/** Applies a fixed discount, clamped so the result never goes negative. */
export function applyFixedDiscount(amountMinor: number, discountMinor: number): number {
  if (!Number.isInteger(discountMinor) || discountMinor < 0) {
    throw new RangeError('discountMinor must be a non-negative integer');
  }
  return Math.max(0, amountMinor - discountMinor);
}

export interface VolumeTier {
  readonly minQuantity: number;
  readonly percent: number;
}

/** Picks the highest tier whose minQuantity is satisfied; 0 % when none matches. */
export function volumeDiscountPercent(quantity: number, tiers: readonly VolumeTier[]): number {
  return tiers
    .filter((tier) => quantity >= tier.minQuantity)
    .reduce((best, tier) => Math.max(best, tier.percent), 0);
}

export function assertPercent(percent: number): void {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`percent must be between 0 and 100, received ${percent}`);
  }
}
