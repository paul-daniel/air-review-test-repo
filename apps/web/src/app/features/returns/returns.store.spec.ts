import { TestBed } from '@angular/core/testing';
import { ReturnStatus } from '@atlas/shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReturnDto } from './return.models';
import { ReturnsService } from './returns.service';
import { ReturnsStore } from './returns.store';

const item = (id: string, status: ReturnStatus): ReturnDto => ({
  id,
  reference: `RET-2026-001050-${id}`,
  orderReference: 'ORD-2026-001050',
  orderId: 'ord_1',
  customerId: 'cus_1',
  status,
  currency: 'EUR',
  lines: [],
  restockingFeeMinor: 0,
  shippingRefundMinor: 0,
  refundTotalMinor: 0,
  requestedAt: '2026-05-20T09:00:00.000Z',
  updatedAt: '2026-05-20T09:00:00.000Z',
});

describe('ReturnsStore', () => {
  const service = { list: vi.fn(), decide: vi.fn(), markReceived: vi.fn(), refund: vi.fn() };

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.list.mockReturnValue(of({ items: [item('a', ReturnStatus.Requested), item('b', ReturnStatus.Refunded)], page: 1, pageSize: 25, total: 2 }));
    TestBed.configureTestingModule({ providers: [{ provide: ReturnsService, useValue: service }] });
  });

  it('loads returns and counts the ones awaiting a decision', async () => {
    const store = TestBed.inject(ReturnsStore);
    await store.load({ status: null });
    expect(store.items()).toHaveLength(2);
    expect(store.awaitingDecision()).toBe(1);
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));
  });

  it('replaces the item after a decision and clears the busy flag', async () => {
    const store = TestBed.inject(ReturnsStore);
    await store.load();
    service.decide.mockReturnValue(of(item('a', ReturnStatus.Approved)));
    const updated = await store.decide('a', { decision: 'approve' });
    expect(updated.status).toBe(ReturnStatus.Approved);
    expect(store.items().find((r) => r.id === 'a')?.status).toBe(ReturnStatus.Approved);
    expect(store.busy()).toBeNull();
  });
});
