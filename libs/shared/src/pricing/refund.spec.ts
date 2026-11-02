import { describe, expect, it } from 'vitest';
import { calculateRefund, refundForLine } from './refund';

describe('refundForLine', () => {
  it('refunds the full paid amount when every unit comes back', () => {
    expect(refundForLine({ orderedQuantity: 3, returnedQuantity: 3, unitPriceMinor: 1000, lineDiscountMinor: 250 })).toEqual({
      grossMinor: 3000,
      discountShareMinor: 250,
      refundMinor: 2750,
    });
  });

  it('allocates the discount pro rata with rounding', () => {
    expect(refundForLine({ orderedQuantity: 3, returnedQuantity: 1, unitPriceMinor: 1000, lineDiscountMinor: 250 })).toEqual({
      grossMinor: 1000,
      discountShareMinor: 83,
      refundMinor: 917,
    });
    expect(refundForLine({ orderedQuantity: 3, returnedQuantity: 2, unitPriceMinor: 1000, lineDiscountMinor: 250 }).discountShareMinor).toBe(167);
  });

  it('rejects impossible quantities', () => {
    expect(() => refundForLine({ orderedQuantity: 1, returnedQuantity: 2, unitPriceMinor: 1, lineDiscountMinor: 0 })).toThrow(RangeError);
  });
});

describe('calculateRefund', () => {
  const lines = [
    { orderedQuantity: 2, returnedQuantity: 2, unitPriceMinor: 2500, lineDiscountMinor: 250 },
    { orderedQuantity: 1, returnedQuantity: 1, unitPriceMinor: 1400, lineDiscountMinor: 0 },
  ];

  it('sums lines, withholds the restocking fee and adds the shipping refund', () => {
    const result = calculateRefund(lines, { restockingFeePercent: 10, shippingRefundMinor: 590 });
    expect(result.linesRefundMinor).toBe(4750 + 1400);
    expect(result.restockingFeeMinor).toBe(615);
    expect(result.totalMinor).toBe(6150 - 615 + 590);
  });

  it('applies no fee for zero percent', () => {
    const result = calculateRefund(lines, { restockingFeePercent: 0, shippingRefundMinor: 0 });
    expect(result.restockingFeeMinor).toBe(0);
    expect(result.totalMinor).toBe(6150);
  });

  it('rejects invalid percentages', () => {
    expect(() => calculateRefund(lines, { restockingFeePercent: 120, shippingRefundMinor: 0 })).toThrow(RangeError);
  });
});
