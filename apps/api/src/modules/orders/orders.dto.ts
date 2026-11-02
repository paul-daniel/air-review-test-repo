import type { Address, CurrencyCode, OrderStatus } from '@atlas/shared';

export interface CreateOrderLineDto {
  readonly productId: string;
  readonly sku: string;
  readonly quantity: number;
}

export interface CreateOrderDto {
  readonly customerId: string;
  readonly currency: CurrencyCode;
  readonly shippingAddress: Address;
  readonly lines: readonly CreateOrderLineDto[];
  readonly promoCode?: string;
  readonly note?: string;
}

export interface TransitionOrderDto {
  readonly status: OrderStatus;
  readonly reason?: string;
}

export interface OrderListQuery {
  readonly customerId?: string;
  readonly status?: OrderStatus;
  readonly from?: string;
  readonly to?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrderResponseDto {
  /** Human-readable reference such as ORD-2026-000042. */
  readonly reference: string;
  readonly id: string;
  readonly number: number;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly currency: CurrencyCode;
  readonly lines: readonly {
    readonly id: string;
    readonly productId: string;
    readonly sku: string;
    readonly name: string;
    readonly quantity: number;
    readonly unitPriceMinor: number;
    readonly discountMinor: number;
  }[];
  readonly totals: {
    readonly subtotalMinor: number;
    readonly discountMinor: number;
    readonly shippingMinor: number;
    readonly taxMinor: number;
    readonly grandTotalMinor: number;
  };
  readonly shippingAddress: Address;
  readonly note?: string;
  readonly placedAt: string;
  readonly updatedAt: string;
}
