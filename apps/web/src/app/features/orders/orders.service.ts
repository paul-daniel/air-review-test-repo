import { Injectable, inject } from '@angular/core';
import type { OrderStatus } from '@atlas/shared';
import { Subject, type Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type { CreateOrderRequest, OrderAlert, OrderDto, OrderEventDto, OrderListFilter, OrderSummaryDto } from './order.models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiClientService);
  private readonly alerts = new Subject<OrderAlert>();

  /** Operational alerts raised while working with orders (consumed by the store / UI). */
  readonly alerts$: Observable<OrderAlert> = this.alerts.asObservable();

  list(filter: OrderListFilter): Observable<Paged<OrderSummaryDto>> {
    return this.api.get<Paged<OrderSummaryDto>>('orders', {
      customerId: filter.customerId,
      status: filter.status,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): Observable<OrderDto> {
    return this.api.get<OrderDto>(`orders/${id}`);
  }

  history(id: string): Observable<readonly OrderEventDto[]> {
    return this.api.get<readonly OrderEventDto[]>(`orders/${id}/history`);
  }

  create(request: CreateOrderRequest): Observable<OrderDto> {
    return this.api.post<OrderDto>('orders', request);
  }

  transition(id: string, status: OrderStatus, reason?: string): Observable<OrderDto> {
    return this.api.post<OrderDto>(`orders/${id}/transition`, reason ? { status, reason } : { status });
  }

  raiseAlert(alert: OrderAlert): void {
    this.alerts.next(alert);
  }
}
