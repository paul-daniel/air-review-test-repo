import { TestBed } from '@angular/core/testing';
import { OrderStatus } from '@atlas/shared';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDto } from './order.models';
import { OrdersService } from './orders.service';
import { OrdersStore } from './orders.store';

const order = (id: string, status: OrderStatus, reference = 'ORD-2026-000001'): OrderDto => ({
  id,
  reference,
  number: 1,
  customerId: 'cus_1',
  status,
  currency: 'EUR',
  lines: [],
  totals: { subtotalMinor: 0, discountMinor: 0, shippingMinor: 0, taxMinor: 0, grandTotalMinor: 0 },
  shippingAddress: { line1: 'x', postalCode: '1', city: 'c', countryCode: 'FR' },
  placedAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
});

describe('OrdersStore', () => {
  const service = { list: vi.fn(), get: vi.fn(), history: vi.fn(), transition: vi.fn(), raiseAlert: vi.fn() };

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.list.mockReturnValue(of({ items: [order('ord_1', OrderStatus.Pending), order('ord_2', OrderStatus.Paid, 'ORD-2026-000002')], page: 1, pageSize: 25, total: 2 }));
    service.get.mockImplementation((id: string) => of(order(id, OrderStatus.Pending)));
    service.history.mockReturnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: OrdersService, useValue: service }] });
  });

  it('loads and filters the list client-side by reference', async () => {
    const store = TestBed.inject(OrdersStore);
    await store.load();
    expect(store.items()).toHaveLength(2);
    expect(store.pendingCount()).toBe(1);
    await store.load({ search: '000002' });
    expect(store.items().map((o) => o.id)).toEqual(['ord_2']);
  });

  it('exposes the allowed transitions for the selected order', async () => {
    const store = TestBed.inject(OrdersStore);
    await store.select('ord_1');
    expect(store.availableTransitions()).toEqual([OrderStatus.Paid, OrderStatus.Cancelled]);
  });

  it('ignores illegal transitions and raises an alert on failure', async () => {
    const store = TestBed.inject(OrdersStore);
    await store.select('ord_1');
    expect(await store.transition(OrderStatus.Delivered)).toBeNull();
    service.transition.mockReturnValue(throwError(() => new Error('boom')));
    await expect(store.transition(OrderStatus.Paid)).rejects.toThrow('boom');
    expect(service.raiseAlert).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'ord_1', kind: 'transition_failed' }));
    expect(store.isBusy()).toBe(false);
  });

  it('updates list and selection after a successful transition', async () => {
    const store = TestBed.inject(OrdersStore);
    await store.load();
    await store.select('ord_1');
    service.transition.mockReturnValue(of(order('ord_1', OrderStatus.Paid)));
    await store.transition(OrderStatus.Paid);
    expect(store.selected()?.status).toBe(OrderStatus.Paid);
    expect(store.items().find((o) => o.id === 'ord_1')?.status).toBe(OrderStatus.Paid);
  });
});
