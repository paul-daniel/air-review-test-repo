import {
  collect,
  CUSTOMER_TIERS,
  isRecord,
  optionalString,
  requireBoolean,
  requireCountryCode,
  requireEmail,
  requireOneOf,
  requirePostalCode,
  requireString,
  type Address,
  type CustomerTier,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import type { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';

export function validateAddress(value: unknown, prefix: string): FieldError[] {
  if (!isRecord(value)) {
    return [{ field: prefix, code: 'type', message: `${prefix} must be an object` }];
  }
  return [
    requireString(value['line1'], `${prefix}.line1`, { max: 120 }),
    optionalString(value['line2'], `${prefix}.line2`, 120),
    requirePostalCode(value['postalCode'], `${prefix}.postalCode`),
    requireString(value['city'], `${prefix}.city`, { max: 80 }),
    requireCountryCode(value['countryCode'], `${prefix}.countryCode`),
  ].filter((e): e is FieldError => e !== null);
}

export function toAddress(value: Record<string, unknown>): Address {
  const line2 = typeof value['line2'] === 'string' && value['line2'].trim() !== '' ? value['line2'].trim() : undefined;
  return {
    line1: (value['line1'] as string).trim(),
    ...(line2 !== undefined ? { line2 } : {}),
    postalCode: (value['postalCode'] as string).trim(),
    city: (value['city'] as string).trim(),
    countryCode: value['countryCode'] as string,
  };
}

export function validateCreateCustomer(
  body: unknown,
): ValidationResult & { readonly value?: CreateCustomerDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const errors = [
    requireEmail(body['email']),
    requireString(body['firstName'], 'firstName', { max: 60 }),
    requireString(body['lastName'], 'lastName', { max: 60 }),
    body['tier'] === undefined ? null : requireOneOf(body['tier'], 'tier', CUSTOMER_TIERS),
    body['marketingOptIn'] === undefined ? null : requireBoolean(body['marketingOptIn'], 'marketingOptIn'),
    ...validateAddress(body['billingAddress'], 'billingAddress'),
    ...(body['shippingAddress'] === undefined ? [] : validateAddress(body['shippingAddress'], 'shippingAddress')),
  ];
  const result = collect(errors);
  if (!result.valid) return result;
  return {
    valid: true,
    value: {
      email: (body['email'] as string).trim().toLowerCase(),
      firstName: (body['firstName'] as string).trim(),
      lastName: (body['lastName'] as string).trim(),
      ...(body['tier'] !== undefined ? { tier: body['tier'] as CustomerTier } : {}),
      billingAddress: toAddress(body['billingAddress'] as Record<string, unknown>),
      ...(body['shippingAddress'] !== undefined
        ? { shippingAddress: toAddress(body['shippingAddress'] as Record<string, unknown>) }
        : {}),
      ...(body['marketingOptIn'] !== undefined ? { marketingOptIn: body['marketingOptIn'] as boolean } : {}),
    },
  };
}

export function validateUpdateCustomer(
  body: unknown,
): ValidationResult & { readonly value?: UpdateCustomerDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const errors = [
    body['firstName'] === undefined ? null : requireString(body['firstName'], 'firstName', { max: 60 }),
    body['lastName'] === undefined ? null : requireString(body['lastName'], 'lastName', { max: 60 }),
    body['tier'] === undefined ? null : requireOneOf(body['tier'], 'tier', CUSTOMER_TIERS),
    body['marketingOptIn'] === undefined ? null : requireBoolean(body['marketingOptIn'], 'marketingOptIn'),
    ...(body['billingAddress'] === undefined ? [] : validateAddress(body['billingAddress'], 'billingAddress')),
    ...(body['shippingAddress'] === undefined || body['shippingAddress'] === null
      ? []
      : validateAddress(body['shippingAddress'], 'shippingAddress')),
  ];
  const result = collect(errors);
  if (!result.valid) return result;
  const value: UpdateCustomerDto = {
    ...(body['firstName'] !== undefined ? { firstName: (body['firstName'] as string).trim() } : {}),
    ...(body['lastName'] !== undefined ? { lastName: (body['lastName'] as string).trim() } : {}),
    ...(body['tier'] !== undefined ? { tier: body['tier'] as CustomerTier } : {}),
    ...(body['marketingOptIn'] !== undefined ? { marketingOptIn: body['marketingOptIn'] as boolean } : {}),
    ...(body['billingAddress'] !== undefined
      ? { billingAddress: toAddress(body['billingAddress'] as Record<string, unknown>) }
      : {}),
    ...(body['shippingAddress'] === null
      ? { shippingAddress: null }
      : body['shippingAddress'] !== undefined
        ? { shippingAddress: toAddress(body['shippingAddress'] as Record<string, unknown>) }
        : {}),
  };
  return { valid: true, value };
}
