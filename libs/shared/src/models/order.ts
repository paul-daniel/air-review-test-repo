import type { Address } from './customer';
import type { Money } from './money';
import type { OrderStatus } from './order-status';

export interface OrderLine {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  /** Unit price at the time of ordering, in minor units. */
  readonly unitPrice: Money;
  /** Line discount already applied, in minor units (never negative). */
  readonly discountMinor: number;
}

export interface OrderTotals {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly grandTotalMinor: number;
}

export interface Order {
  readonly id: string;
  /** Sequential order number, unique per year. */
  readonly number: number;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly currency: Money['currency'];
  readonly lines: readonly OrderLine[];
  readonly totals: OrderTotals;
  readonly shippingAddress: Address;
  readonly note?: string;
  readonly placedAt: string;
  readonly updatedAt: string;
}

export interface OrderSummary {
  readonly id: string;
  readonly number: number;
  readonly customerId: string;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly currency: Money['currency'];
  readonly grandTotalMinor: number;
  readonly lineCount: number;
  readonly placedAt: string;
}

export function lineGrossMinor(line: Pick<OrderLine, 'quantity' | 'unitPrice'>): number {
  return line.unitPrice.amountMinor * line.quantity;
}

export function lineNetMinor(line: Pick<OrderLine, 'quantity' | 'unitPrice' | 'discountMinor'>): number {
  return Math.max(0, lineGrossMinor(line) - line.discountMinor);
}
