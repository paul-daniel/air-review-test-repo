import {
  collect,
  isRecord,
  optionalString,
  requireArray,
  requireCountryCode,
  requireInteger,
  requireOneOf,
  requireString,
  SUPPORTED_CURRENCIES,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import type { QuoteLineDto, QuoteRequestDto } from './pricing.dto';

const MAX_LINES = 200;
const MAX_QUANTITY = 10_000;

export function validateQuoteLines(value: unknown, field = 'lines'): FieldError[] {
  const arrayError = requireArray(value, field, { minLength: 1, maxLength: MAX_LINES });
  if (arrayError) return [arrayError];
  return (value as unknown[]).flatMap((line, index) => {
    if (!isRecord(line)) {
      return [{ field: `${field}[${index}]`, code: 'type', message: 'line must be an object' }];
    }
    return [
      requireString(line['productId'], `${field}[${index}].productId`, { max: 40 }),
      requireInteger(line['quantity'], `${field}[${index}].quantity`, { min: 1, max: MAX_QUANTITY }),
    ].filter((e): e is FieldError => e !== null);
  });
}

export function toQuoteLines(value: unknown[]): QuoteLineDto[] {
  return value.map((line) => {
    const record = line as Record<string, unknown>;
    return { productId: record['productId'] as string, quantity: record['quantity'] as number };
  });
}

export function validateQuoteRequest(
  body: unknown,
): ValidationResult & { readonly value?: QuoteRequestDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireString(body['customerId'], 'customerId', { max: 40 }),
    requireOneOf(body['currency'], 'currency', SUPPORTED_CURRENCIES),
    requireCountryCode(body['shippingCountryCode'], 'shippingCountryCode'),
    optionalString(body['promoCode'], 'promoCode', 32),
    ...validateQuoteLines(body['lines']),
  ]);
  if (!result.valid) return result;
  const promoCode = typeof body['promoCode'] === 'string' ? body['promoCode'].trim().toUpperCase() : '';
  return {
    valid: true,
    value: {
      customerId: body['customerId'] as string,
      currency: body['currency'] as QuoteRequestDto['currency'],
      shippingCountryCode: body['shippingCountryCode'] as string,
      lines: toQuoteLines(body['lines'] as unknown[]),
      ...(promoCode ? { promoCode } : {}),
    },
  };
}
