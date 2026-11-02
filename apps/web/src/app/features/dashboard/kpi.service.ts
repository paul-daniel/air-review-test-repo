import { Injectable, inject } from '@angular/core';
import { OrderStatus } from '@atlas/shared';
import { forkJoin, map, type Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type { OrderSummaryDto } from '../orders/order.models';

export interface DashboardKpis {
  readonly ordersToday: number;
  readonly revenueTodayMinor: number;
  readonly pendingOrders: number;
  readonly openTickets: Record<'P1' | 'P2' | 'P3' | 'P4', number>;
  readonly averageOrderValueMinor: number;
  readonly currency: 'EUR';
}

interface Backlog {
  readonly P1: number;
  readonly P2: number;
  readonly P3: number;
  readonly P4: number;
}

@Injectable({ providedIn: 'root' })
export class KpiService {
  private readonly api = inject(ApiClientService);

  load(now: Date = new Date()): Observable<DashboardKpis> {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    return forkJoin({
      today: this.api.get<Paged<OrderSummaryDto>>('orders', { from, pageSize: 100 }),
      pending: this.api.get<Paged<OrderSummaryDto>>('orders', { status: OrderStatus.Pending, pageSize: 1 }),
      backlog: this.api.get<Backlog>('support/tickets/backlog'),
    }).pipe(map(({ today, pending, backlog }) => computeKpis(today.items, pending.total, backlog)));
  }
}

export function computeKpis(
  todayOrders: readonly OrderSummaryDto[],
  pendingOrders: number,
  backlog: Backlog,
): DashboardKpis {
  const billable = todayOrders.filter((order) => order.status !== OrderStatus.Cancelled);
  const revenueTodayMinor = billable.reduce((sum, order) => sum + order.totals.grandTotalMinor, 0);
  return {
    ordersToday: billable.length,
    revenueTodayMinor,
    pendingOrders,
    openTickets: backlog,
    averageOrderValueMinor: billable.length === 0 ? 0 : Math.round(revenueTodayMinor / billable.length),
    currency: 'EUR',
  };
}
