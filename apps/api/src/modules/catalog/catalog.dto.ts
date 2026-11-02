import type { CurrencyCode, ProductCategory } from '@atlas/shared';

export interface ProductVariantDto {
  readonly sku: string;
  readonly label: string;
  readonly stock: number;
  readonly priceOverrideMinor?: number;
}

export interface CreateProductDto {
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly category: ProductCategory;
  readonly priceMinor: number;
  readonly currency: CurrencyCode;
  readonly taxRatePercent: number;
  readonly variants?: readonly ProductVariantDto[];
  readonly active?: boolean;
}

export interface UpdateProductDto {
  readonly name?: string;
  readonly description?: string;
  readonly category?: ProductCategory;
  readonly priceMinor?: number;
  readonly taxRatePercent?: number;
  readonly variants?: readonly ProductVariantDto[];
  readonly active?: boolean;
}

export interface ProductListQuery {
  readonly search?: string;
  readonly category?: ProductCategory;
  readonly includeInactive: boolean;
  readonly page: number;
  readonly pageSize: number;
}

export interface StockAdjustmentDto {
  readonly sku: string;
  readonly delta: number;
  readonly reason: string;
}
