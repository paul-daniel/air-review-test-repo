import {
  collect,
  isRecord,
  optionalString,
  requireArray,
  requireInteger,
  requireIsoDate,
  requireOneOf,
  requireSku,
  requireString,
  OrderStatus,
  SUPPORTED_CURRENCIES,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import { toAddress, validateAddress } from '../customers/customers.validation';
import type { CreateOrderDto, CreateOrderLineDto, TransitionOrderDto } from './orders.dto';

const ORDER_STATUSES = Object.values(OrderStatus);

function validateLines(value: unknown): FieldError[] {
  const arrayError = requireArray(value, 'lines', { minLength: 1, maxLength: 200 });
  if (arrayError) return [arrayError];
  return (value as unknown[]).flatMap((line, index) => {
    const prefix = `lines[${index}]`;
    if (!isRecord(line)) {
      return [{ field: prefix, code: 'type', message: `${prefix} must be an object` }];
    }
    return [
      requireString(line['productId'], `${prefix}.productId`, { max: 40 }),
      requireSku(line['sku'], `${prefix}.sku`),
      requireInteger(line['quantity'], `${prefix}.quantity`, { min: 1, max: 10_000 }),
    ].filter((e): e is FieldError => e !== null);
  });
}

export function validateCreateOrder(body: unknown): ValidationResult & { readonly value?: CreateOrderDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireString(body['customerId'], 'customerId', { max: 40 }),
    requireOneOf(body['currency'], 'currency', SUPPORTED_CURRENCIES),
    optionalString(body['promoCode'], 'promoCode', 32),
    optionalString(body['note'], 'note', 1000),
    ...validateAddress(body['shippingAddress'], 'shippingAddress'),
    ...validateLines(body['lines']),
  ]);
  if (!result.valid) return result;
  const lines: CreateOrderLineDto[] = (body['lines'] as Record<string, unknown>[]).map((line) => ({
    productId: line['productId'] as string,
    sku: line['sku'] as string,
    quantity: line['quantity'] as number,
  }));
  const promoCode = typeof body['promoCode'] === 'string' ? body['promoCode'].trim().toUpperCase() : '';
  const note = typeof body['note'] === 'string' ? body['note'].trim() : '';
  return {
    valid: true,
    value: {
      customerId: body['customerId'] as string,
      currency: body['currency'] as CreateOrderDto['currency'],
      shippingAddress: toAddress(body['shippingAddress'] as Record<string, unknown>),
      lines,
      ...(promoCode ? { promoCode } : {}),
      ...(note ? { note } : {}),
    },
  };
}

export function validateTransition(body: unknown): ValidationResult & { readonly value?: TransitionOrderDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireOneOf(body['status'], 'status', ORDER_STATUSES),
    optionalString(body['reason'], 'reason', 500),
  ]);
  if (!result.valid) return result;
  const reason = typeof body['reason'] === 'string' ? body['reason'].trim() : '';
  return { valid: true, value: { status: body['status'] as OrderStatus, ...(reason ? { reason } : {}) } };
}

export function validateDateRange(from: string | null, to: string | null): FieldError[] {
  return [
    from === null ? null : requireIsoDate(from, 'from'),
    to === null ? null : requireIsoDate(to, 'to'),
  ].filter((e): e is FieldError => e !== null);
}
