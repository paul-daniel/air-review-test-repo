import type { Address, CurrencyCode, OrderStatus, OrderTotals } from '@atlas/shared';

export interface OrderLineDto {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
}

export interface OrderDto {
  readonly reference: string;
  readonly id: string;
  readonly number: number;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly currency: CurrencyCode;
  readonly lines: readonly OrderLineDto[];
  readonly totals: OrderTotals;
  readonly shippingAddress: Address;
  readonly note?: string;
  readonly placedAt: string;
  readonly updatedAt: string;
}

/** Lists return the same shape as details; alias kept for readability at call sites. */
export type OrderSummaryDto = OrderDto;

export interface OrderEventDto {
  readonly orderId: string;
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly at: string;
  readonly actor: string;
  readonly reason?: string;
}

export interface OrderListFilter {
  readonly customerId: string | null;
  readonly status: OrderStatus | null;
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrderDraftLine {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
}

export interface OrderDraft {
  readonly customerId: string;
  readonly currency: CurrencyCode;
  readonly shippingAddress: Address;
  readonly lines: readonly OrderDraftLine[];
  readonly promoCode: string;
  readonly note: string;
}

export interface CreateOrderRequest {
  readonly customerId: string;
  readonly currency: CurrencyCode;
  readonly shippingAddress: Address;
  readonly lines: readonly { readonly productId: string; readonly sku: string; readonly quantity: number }[];
  readonly promoCode?: string;
  readonly note?: string;
}

export interface OrderAlert {
  readonly orderId: string;
  readonly kind: 'transition_failed' | 'stock_shortfall' | 'stale_pending';
  readonly message: string;
}
