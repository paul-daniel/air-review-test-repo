import {
  collect,
  isRecord,
  optionalString,
  PRODUCT_CATEGORIES,
  requireArray,
  requireBoolean,
  requireInteger,
  requireOneOf,
  requireSku,
  requireString,
  SUPPORTED_CURRENCIES,
  type FieldError,
  type ProductCategory,
  type ValidationResult,
} from '@atlas/shared';
import type { CreateProductDto, ProductVariantDto, StockAdjustmentDto, UpdateProductDto } from './catalog.dto';

const MAX_PRICE_MINOR = 100_000_000;

function validateVariants(value: unknown): FieldError[] {
  const arrayError = requireArray(value, 'variants', { maxLength: 50 });
  if (arrayError) return [arrayError];
  const seen = new Set<string>();
  return (value as unknown[]).flatMap((variant, index) => {
    const prefix = `variants[${index}]`;
    if (!isRecord(variant)) {
      return [{ field: prefix, code: 'type', message: `${prefix} must be an object` }];
    }
    const errors = [
      requireSku(variant['sku'], `${prefix}.sku`),
      requireString(variant['label'], `${prefix}.label`, { max: 60 }),
      requireInteger(variant['stock'], `${prefix}.stock`, { min: 0 }),
      variant['priceOverrideMinor'] === undefined
        ? null
        : requireInteger(variant['priceOverrideMinor'], `${prefix}.priceOverrideMinor`, { min: 0, max: MAX_PRICE_MINOR }),
    ].filter((e): e is FieldError => e !== null);
    if (typeof variant['sku'] === 'string') {
      if (seen.has(variant['sku'])) {
        errors.push({ field: `${prefix}.sku`, code: 'duplicate', message: 'variant SKUs must be unique' });
      }
      seen.add(variant['sku']);
    }
    return errors;
  });
}

function toVariants(value: unknown[]): ProductVariantDto[] {
  return value.map((variant) => {
    const record = variant as Record<string, unknown>;
    return {
      sku: record['sku'] as string,
      label: (record['label'] as string).trim(),
      stock: record['stock'] as number,
      ...(record['priceOverrideMinor'] !== undefined ? { priceOverrideMinor: record['priceOverrideMinor'] as number } : {}),
    };
  });
}

export function validateCreateProduct(
  body: unknown,
): ValidationResult & { readonly value?: CreateProductDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireSku(body['sku']),
    requireString(body['name'], 'name', { max: 120 }),
    optionalString(body['description'], 'description', 2000),
    requireOneOf(body['category'], 'category', PRODUCT_CATEGORIES),
    requireInteger(body['priceMinor'], 'priceMinor', { min: 0, max: MAX_PRICE_MINOR }),
    requireOneOf(body['currency'], 'currency', SUPPORTED_CURRENCIES),
    requireInteger(body['taxRatePercent'], 'taxRatePercent', { min: 0, max: 100 }),
    body['active'] === undefined ? null : requireBoolean(body['active'], 'active'),
    ...(body['variants'] === undefined ? [] : validateVariants(body['variants'])),
  ]);
  if (!result.valid) return result;
  return {
    valid: true,
    value: {
      sku: body['sku'] as string,
      name: (body['name'] as string).trim(),
      ...(typeof body['description'] === 'string' ? { description: body['description'].trim() } : {}),
      category: body['category'] as CreateProductDto['category'],
      priceMinor: body['priceMinor'] as number,
      currency: body['currency'] as CreateProductDto['currency'],
      taxRatePercent: body['taxRatePercent'] as number,
      ...(body['variants'] !== undefined ? { variants: toVariants(body['variants'] as unknown[]) } : {}),
      ...(body['active'] !== undefined ? { active: body['active'] as boolean } : {}),
    },
  };
}

export function validateUpdateProduct(
  body: unknown,
): ValidationResult & { readonly value?: UpdateProductDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    body['name'] === undefined ? null : requireString(body['name'], 'name', { max: 120 }),
    optionalString(body['description'], 'description', 2000),
    body['category'] === undefined ? null : requireOneOf(body['category'], 'category', PRODUCT_CATEGORIES),
    body['priceMinor'] === undefined ? null : requireInteger(body['priceMinor'], 'priceMinor', { min: 0, max: MAX_PRICE_MINOR }),
    body['taxRatePercent'] === undefined ? null : requireInteger(body['taxRatePercent'], 'taxRatePercent', { min: 0, max: 100 }),
    body['active'] === undefined ? null : requireBoolean(body['active'], 'active'),
    ...(body['variants'] === undefined ? [] : validateVariants(body['variants'])),
  ]);
  if (!result.valid) return result;
  return {
    valid: true,
    value: {
      ...(body['name'] !== undefined ? { name: (body['name'] as string).trim() } : {}),
      ...(typeof body['description'] === 'string' ? { description: body['description'].trim() } : {}),
      ...(body['category'] !== undefined ? { category: body['category'] as ProductCategory } : {}),
      ...(body['priceMinor'] !== undefined ? { priceMinor: body['priceMinor'] as number } : {}),
      ...(body['taxRatePercent'] !== undefined ? { taxRatePercent: body['taxRatePercent'] as number } : {}),
      ...(body['variants'] !== undefined ? { variants: toVariants(body['variants'] as unknown[]) } : {}),
      ...(body['active'] !== undefined ? { active: body['active'] as boolean } : {}),
    },
  };
}

export function validateStockAdjustment(
  body: unknown,
): ValidationResult & { readonly value?: StockAdjustmentDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireSku(body['sku']),
    requireInteger(body['delta'], 'delta', { min: -100_000, max: 100_000 }),
    requireString(body['reason'], 'reason', { max: 200 }),
  ]);
  if (!result.valid) return result;
  if (body['delta'] === 0) {
    return { valid: false, errors: [{ field: 'delta', code: 'zero', message: 'delta must not be zero' }] };
  }
  return {
    valid: true,
    value: { sku: body['sku'] as string, delta: body['delta'] as number, reason: (body['reason'] as string).trim() },
  };
}
