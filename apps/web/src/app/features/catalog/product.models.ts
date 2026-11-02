import type { CurrencyCode, Product, ProductCategory, ProductVariant } from '@atlas/shared';

export type { Product, ProductCategory, ProductVariant };

export interface ProductListFilter {
  readonly search: string;
  readonly category: ProductCategory | null;
  readonly includeInactive: boolean;
  readonly page: number;
  readonly pageSize: number;
}

export interface ProductFormValue {
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  readonly priceMinor: number;
  readonly currency: CurrencyCode;
  readonly taxRatePercent: number;
  readonly active: boolean;
}

export interface StockAdjustment {
  readonly sku: string;
  readonly delta: number;
  readonly reason: string;
}
