import { roundHalfAwayFromZero } from '../money';
import { assertPercent } from './discount';

export interface RefundLineInput {
  readonly orderedQuantity: number;
  readonly returnedQuantity: number;
  readonly unitPriceMinor: number;
  /** Discount applied to the whole order line, in minor units. */
  readonly lineDiscountMinor: number;
}

export interface RefundLineResult {
  readonly grossMinor: number;
  /** Share of the line discount attributable to the returned quantity. */
  readonly discountShareMinor: number;
  readonly refundMinor: number;
}

export interface RefundOptions {
  /** Percentage withheld from the line refunds (0 for damaged / wrong item). */
  readonly restockingFeePercent: number;
  /** Shipping refunded when the whole order is returned, in minor units. */
  readonly shippingRefundMinor: number;
}

export interface RefundResult {
  readonly lines: readonly RefundLineResult[];
  readonly linesRefundMinor: number;
  readonly restockingFeeMinor: number;
  readonly shippingRefundMinor: number;
  readonly totalMinor: number;
}

/**
 * Refund for one line: the returned units at the paid unit price, minus the
 * pro-rata share of the line discount. The share is rounded so that returning
 * every unit of a line refunds exactly what was paid for it.
 */
export function refundForLine(input: RefundLineInput): RefundLineResult {
  if (input.returnedQuantity < 0 || input.returnedQuantity > input.orderedQuantity) {
    throw new RangeError('returnedQuantity must be between 0 and orderedQuantity');
  }
  const grossMinor = input.unitPriceMinor * input.returnedQuantity;
  const discountShareMinor =
    input.returnedQuantity === input.orderedQuantity
      ? input.lineDiscountMinor
      : roundHalfAwayFromZero((input.lineDiscountMinor * input.returnedQuantity) / input.orderedQuantity);
  return { grossMinor, discountShareMinor, refundMinor: Math.max(0, grossMinor - discountShareMinor) };
}

export function calculateRefund(lines: readonly RefundLineInput[], options: RefundOptions): RefundResult {
  assertPercent(options.restockingFeePercent);
  const results = lines.map(refundForLine);
  const linesRefundMinor = results.reduce((sum, line) => sum + line.refundMinor, 0);
  const restockingFeeMinor = roundHalfAwayFromZero((linesRefundMinor * options.restockingFeePercent) / 100);
  const shippingRefundMinor = Math.max(0, options.shippingRefundMinor);
  return {
    lines: results,
    linesRefundMinor,
    restockingFeeMinor,
    shippingRefundMinor,
    totalMinor: Math.max(0, linesRefundMinor - restockingFeeMinor + shippingRefundMinor),
  };
}
