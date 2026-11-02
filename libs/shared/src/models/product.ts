import type { Money } from './money';

export type ProductCategory = 'apparel' | 'footwear' | 'accessories' | 'home' | 'electronics';

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'apparel',
  'footwear',
  'accessories',
  'home',
  'electronics',
];

export interface ProductVariant {
  readonly sku: string;
  readonly label: string;
  readonly stock: number;
  readonly priceOverride?: Money;
}

export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  readonly price: Money;
  readonly taxRatePercent: number;
  readonly variants: readonly ProductVariant[];
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function totalStock(product: Pick<Product, 'variants'>): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === 'string' && (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}
