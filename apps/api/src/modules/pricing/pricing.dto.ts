import type { CurrencyCode, CustomerTier, OrderTotals } from '@atlas/shared';

export interface QuoteLineDto {
  readonly productId: string;
  readonly quantity: number;
}

export interface QuoteRequestDto {
  readonly customerId: string;
  readonly currency: CurrencyCode;
  readonly shippingCountryCode: string;
  readonly lines: readonly QuoteLineDto[];
  readonly promoCode?: string;
}

export interface QuoteLineResultDto {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly netMinor: number;
}

export interface QuoteResponseDto {
  readonly currency: CurrencyCode;
  readonly customerTier: CustomerTier;
  readonly tierDiscountPercent: number;
  readonly lines: readonly QuoteLineResultDto[];
  readonly totals: OrderTotals;
  readonly appliedPromo?: string;
}
