import {
  collect,
  isRecord,
  normalizePromotionCode,
  optionalString,
  PROMOTION_KINDS,
  requireArray,
  requireInteger,
  requireIsoDate,
  requireOneOf,
  requireString,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import type { CreatePromotionDto, UpdatePromotionDto } from './promotions.dto';

const MAX_PERCENT = 100;
const MAX_FIXED_MINOR = 1_000_000;

function validateTiers(value: unknown, field = 'tiers'): FieldError[] {
  if (value === undefined) return [];
  const arrayError = requireArray(value, field, { minLength: 0, maxLength: 4 });
  if (arrayError) return [arrayError];
  return (value as unknown[])
    .map((tier, index) => requireOneOf(tier, `${field}[${index}]`, ['standard', 'silver', 'gold', 'platinum'] as const))
    .filter((e): e is FieldError => e !== null);
}

function validateValue(kind: unknown, value: unknown, field = 'value'): FieldError | null {
  if (kind === 'percent') return requireInteger(value, field, { min: 1, max: MAX_PERCENT });
  if (kind === 'fixed') return requireInteger(value, field, { min: 1, max: MAX_FIXED_MINOR });
  if (kind === 'free_shipping') return value === undefined || value === 0 ? null : { field, code: 'invalid', message: 'free_shipping has no value' };
  return null;
}

function validateUsageLimit(value: unknown, field = 'usageLimit'): FieldError | null {
  if (value === undefined || value === null) return null;
  return requireInteger(value, field, { min: 1, max: 1_000_000 });
}

function validateDates(startsAt: unknown, endsAt: unknown): FieldError | null {
  if (typeof startsAt === 'string' && typeof endsAt === 'string' && endsAt <= startsAt) {
    return { field: 'endsAt', code: 'range', message: 'endsAt must be after startsAt' };
  }
  return null;
}

export function validateCreatePromotion(body: unknown): ValidationResult & { readonly value?: CreatePromotionDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireString(body['code'], 'code', { max: 32 }),
    requireString(body['name'], 'name', { max: 120 }),
    requireOneOf(body['kind'], 'kind', PROMOTION_KINDS),
    validateValue(body['kind'], body['value']),
    body['minSubtotalMinor'] === undefined ? null : requireInteger(body['minSubtotalMinor'], 'minSubtotalMinor', { min: 0, max: 100_000_000 }),
    ...validateTiers(body['tiers']),
    requireIsoDate(body['startsAt'], 'startsAt'),
    requireIsoDate(body['endsAt'], 'endsAt'),
    validateDates(body['startsAt'], body['endsAt']),
    validateUsageLimit(body['usageLimit']),
  ]);
  if (!result.valid) return result;
  return {
    valid: true,
    value: {
      code: normalizePromotionCode(body['code'] as string),
      name: (body['name'] as string).trim(),
      kind: body['kind'] as CreatePromotionDto['kind'],
      value: body['kind'] === 'free_shipping' ? 0 : (body['value'] as number),
      ...(body['minSubtotalMinor'] !== undefined ? { minSubtotalMinor: body['minSubtotalMinor'] as number } : {}),
      ...(body['tiers'] !== undefined ? { tiers: body['tiers'] as string[] } : {}),
      startsAt: body['startsAt'] as string,
      endsAt: body['endsAt'] as string,
      ...(body['usageLimit'] !== undefined ? { usageLimit: body['usageLimit'] as number | null } : {}),
    },
  };
}

export function validateUpdatePromotion(body: unknown, kind: CreatePromotionDto['kind']): ValidationResult & { readonly value?: UpdatePromotionDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    optionalString(body['name'], 'name', 120),
    body['value'] === undefined ? null : validateValue(kind, body['value']),
    body['minSubtotalMinor'] === undefined ? null : requireInteger(body['minSubtotalMinor'], 'minSubtotalMinor', { min: 0, max: 100_000_000 }),
    ...validateTiers(body['tiers']),
    body['startsAt'] === undefined ? null : requireIsoDate(body['startsAt'], 'startsAt'),
    body['endsAt'] === undefined ? null : requireIsoDate(body['endsAt'], 'endsAt'),
    validateDates(body['startsAt'], body['endsAt']),
    validateUsageLimit(body['usageLimit']),
    body['archived'] === undefined ? null : typeof body['archived'] === 'boolean' ? null : { field: 'archived', code: 'type', message: 'archived must be a boolean' },
  ]);
  if (!result.valid) return result;
  const value: UpdatePromotionDto = {
    ...(typeof body['name'] === 'string' ? { name: body['name'].trim() } : {}),
    ...(body['value'] !== undefined ? { value: body['value'] as number } : {}),
    ...(body['minSubtotalMinor'] !== undefined ? { minSubtotalMinor: body['minSubtotalMinor'] as number } : {}),
    ...(body['tiers'] !== undefined ? { tiers: body['tiers'] as string[] } : {}),
    ...(body['startsAt'] !== undefined ? { startsAt: body['startsAt'] as string } : {}),
    ...(body['endsAt'] !== undefined ? { endsAt: body['endsAt'] as string } : {}),
    ...(body['usageLimit'] !== undefined ? { usageLimit: body['usageLimit'] as number | null } : {}),
    ...(body['archived'] !== undefined ? { archived: body['archived'] as boolean } : {}),
  };
  return { valid: true, value };
}
