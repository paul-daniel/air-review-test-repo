import { TestBed } from '@angular/core/testing';
import { OrderStatus } from '@atlas/shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientService } from '../../core/api-client.service';
import type { OrderAlert } from './order.models';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const api = { get: vi.fn(), post: vi.fn() };

  beforeEach(() => {
    api.get.mockReset().mockReturnValue(of({}));
    api.post.mockReset().mockReturnValue(of({}));
    TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: api }] });
  });

  it('omits the reason when none is given', () => {
    const service = TestBed.inject(OrdersService);
    service.transition('ord_1', OrderStatus.Paid).subscribe();
    expect(api.post).toHaveBeenLastCalledWith('orders/ord_1/transition', { status: OrderStatus.Paid });
    service.transition('ord_1', OrderStatus.Cancelled, 'fraud').subscribe();
    expect(api.post).toHaveBeenLastCalledWith('orders/ord_1/transition', { status: OrderStatus.Cancelled, reason: 'fraud' });
  });

  it('broadcasts alerts to subscribers', () => {
    const service = TestBed.inject(OrdersService);
    const received: OrderAlert[] = [];
    const subscription = service.alerts$.subscribe((alert) => received.push(alert));
    service.raiseAlert({ orderId: 'ord_1', kind: 'stale_pending', message: 'old' });
    subscription.unsubscribe();
    expect(received).toHaveLength(1);
  });
});
