import { OrderStatus } from '@atlas/shared';
import { describe, expect, it } from 'vitest';
import type { OrderSummaryDto } from '../orders/order.models';
import { computeKpis } from './kpi.service';

const order = (status: OrderStatus, grandTotalMinor: number): OrderSummaryDto => ({
  id: `ord_${grandTotalMinor}`,
  reference: 'ORD-2026-000001',
  number: 1,
  customerId: 'cus_1',
  status,
  currency: 'EUR',
  totals: { subtotalMinor: 0, discountMinor: 0, shippingMinor: 0, taxMinor: 0, grandTotalMinor },
  lines: [],
  shippingAddress: { line1: 'x', postalCode: '1', city: 'c', countryCode: 'FR' },
  placedAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
});

describe('computeKpis', () => {
  it('ignores cancelled orders and averages the rest', () => {
    const kpis = computeKpis(
      [order(OrderStatus.Paid, 1000), order(OrderStatus.Cancelled, 9999), order(OrderStatus.Shipped, 3001)],
      4,
      { P1: 1, P2: 0, P3: 2, P4: 0 },
    );
    expect(kpis.ordersToday).toBe(2);
    expect(kpis.revenueTodayMinor).toBe(4001);
    expect(kpis.averageOrderValueMinor).toBe(2001);
    expect(kpis.pendingOrders).toBe(4);
  });

  it('handles an empty day', () => {
    expect(computeKpis([], 0, { P1: 0, P2: 0, P3: 0, P4: 0 }).averageOrderValueMinor).toBe(0);
  });
});
