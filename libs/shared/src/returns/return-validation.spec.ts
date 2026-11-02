import { describe, expect, it } from 'vitest';
import { OrderStatus } from '../models/order-status';
import type { Order } from '../models/order';
import { isWithinReturnWindow, returnDeadline, validateReturnRequest } from './return-validation';

const order: Order = {
  id: 'ord_1',
  number: 7,
  customerId: 'cus_1',
  status: OrderStatus.Delivered,
  currency: 'EUR',
  lines: [
    { id: 'lin_a', productId: 'prd_a', sku: 'A-1', name: 'A', quantity: 3, unitPrice: { amountMinor: 1000, currency: 'EUR' }, discountMinor: 0 },
    { id: 'lin_b', productId: 'prd_b', sku: 'B-1', name: 'B', quantity: 1, unitPrice: { amountMinor: 500, currency: 'EUR' }, discountMinor: 0 },
  ],
  totals: { subtotalMinor: 3500, discountMinor: 0, shippingMinor: 0, taxMinor: 700, grandTotalMinor: 4200 },
  shippingAddress: { line1: 'x', postalCode: '75001', city: 'Paris', countryCode: 'FR' },
  placedAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-05T10:00:00.000Z',
};

const inWindow = new Date('2026-05-20T10:00:00.000Z');

describe('return window', () => {
  it('is 30 days after the delivery timestamp', () => {
    expect(returnDeadline(order).toISOString()).toBe('2026-06-04T10:00:00.000Z');
    expect(isWithinReturnWindow(order, inWindow)).toBe(true);
    expect(isWithinReturnWindow(order, new Date('2026-06-04T10:00:01.000Z'))).toBe(false);
    expect(isWithinReturnWindow({ ...order, status: OrderStatus.Shipped }, inWindow)).toBe(false);
  });
});

describe('validateReturnRequest', () => {
  it('accepts a valid request', () => {
    const errors = validateReturnRequest(order, [{ orderLineId: 'lin_a', quantity: 2, reason: 'damaged' }], new Map(), inWindow);
    expect(errors).toEqual([]);
  });

  it('rejects undelivered or expired orders', () => {
    expect(validateReturnRequest({ ...order, status: OrderStatus.Paid }, [], new Map(), inWindow).map((e) => e.code)).toContain('not_delivered');
    expect(validateReturnRequest(order, [], new Map(), new Date('2026-07-01T00:00:00Z')).map((e) => e.code)).toContain('window_expired');
  });

  it('checks line ids, duplicates, quantities and reasons', () => {
    const codes = validateReturnRequest(
      order,
      [
        { orderLineId: 'lin_zz', quantity: 1, reason: 'damaged' },
        { orderLineId: 'lin_a', quantity: 4, reason: 'damaged' },
        { orderLineId: 'lin_a', quantity: 1, reason: 'damaged' },
        { orderLineId: 'lin_b', quantity: 1, reason: 'because' },
      ],
      new Map(),
      inWindow,
    ).map((e) => e.code);
    expect(codes).toEqual(['unknown_line', 'exceeds_remaining', 'duplicate', 'enum']);
  });

  it('takes already returned quantities into account', () => {
    const errors = validateReturnRequest(order, [{ orderLineId: 'lin_a', quantity: 2, reason: 'other' }], new Map([['lin_a', 2]]), inWindow);
    expect(errors[0]?.code).toBe('exceeds_remaining');
    expect(errors[0]?.message).toContain('Only 1 unit(s)');
  });
});
