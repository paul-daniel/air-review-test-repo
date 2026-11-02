import { describe, expect, it } from 'vitest';
import {
  applyFixedDiscount,
  applyPercentDiscount,
  percentDiscountAmount,
  volumeDiscountPercent,
} from './discount';

describe('applyPercentDiscount', () => {
  it('applies a human percentage', () => {
    expect(applyPercentDiscount(10000, 10)).toBe(9000);
    expect(applyPercentDiscount(1999, 15)).toBe(1699);
    expect(applyPercentDiscount(1999, 0)).toBe(1999);
    expect(applyPercentDiscount(1999, 100)).toBe(0);
  });

  it('rounds half away from zero', () => {
    expect(applyPercentDiscount(1001, 50)).toBe(501);
    expect(applyPercentDiscount(999, 33)).toBe(669);
  });

  it('rejects out-of-range percentages', () => {
    expect(() => applyPercentDiscount(1000, -1)).toThrow(RangeError);
    expect(() => applyPercentDiscount(1000, 101)).toThrow(RangeError);
    expect(() => applyPercentDiscount(1000, Number.NaN)).toThrow(RangeError);
  });

  it('exposes the discount amount', () => {
    expect(percentDiscountAmount(10000, 25)).toBe(2500);
  });
});

describe('applyFixedDiscount', () => {
  it('clamps at zero', () => {
    expect(applyFixedDiscount(500, 200)).toBe(300);
    expect(applyFixedDiscount(500, 900)).toBe(0);
  });

  it('rejects negative or fractional discounts', () => {
    expect(() => applyFixedDiscount(500, -1)).toThrow(RangeError);
    expect(() => applyFixedDiscount(500, 1.5)).toThrow(RangeError);
  });
});

describe('volumeDiscountPercent', () => {
  const tiers = [
    { minQuantity: 10, percent: 5 },
    { minQuantity: 50, percent: 12 },
    { minQuantity: 100, percent: 20 },
  ];

  it('picks the best matching tier', () => {
    expect(volumeDiscountPercent(1, tiers)).toBe(0);
    expect(volumeDiscountPercent(10, tiers)).toBe(5);
    expect(volumeDiscountPercent(75, tiers)).toBe(12);
    expect(volumeDiscountPercent(500, tiers)).toBe(20);
  });
});
