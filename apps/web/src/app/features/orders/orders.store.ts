import { Injectable, computed, inject, signal } from '@angular/core';
import { canTransition, OrderStatus, ORDER_STATUS_TRANSITIONS } from '@atlas/shared';
import { firstValueFrom } from 'rxjs';
import type { OrderDto, OrderEventDto, OrderListFilter, OrderSummaryDto } from './order.models';
import { OrdersService } from './orders.service';

export const DEFAULT_ORDER_FILTER: OrderListFilter = {
  customerId: null,
  status: null,
  search: '',
  page: 1,
  pageSize: 25,
};

/**
 * Signal store for the orders feature. Containers call the async methods and
 * read the computed signals; presenters only ever receive plain values.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly ordersService = inject(OrdersService);

  private readonly orders = signal<readonly OrderSummaryDto[]>([]);
  private readonly totalCount = signal(0);
  private readonly selectedOrder = signal<OrderDto | null>(null);
  private readonly selectedHistory = signal<readonly OrderEventDto[]>([]);
  private readonly currentFilter = signal<OrderListFilter>(DEFAULT_ORDER_FILTER);
  private readonly loadingList = signal(false);
  private readonly loadingDetail = signal(false);
  private readonly busy = signal(false);

  readonly items = computed(() => {
    const search = this.currentFilter().search.toLowerCase();
    const all = this.orders();
    return search ? all.filter((order) => order.reference.toLowerCase().includes(search)) : all;
  });
  readonly total = this.totalCount.asReadonly();
  readonly filter = this.currentFilter.asReadonly();
  readonly selected = this.selectedOrder.asReadonly();
  readonly history = this.selectedHistory.asReadonly();
  readonly isLoadingList = this.loadingList.asReadonly();
  readonly isLoadingDetail = this.loadingDetail.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  readonly availableTransitions = computed<readonly OrderStatus[]>(() => {
    const order = this.selectedOrder();
    return order ? ORDER_STATUS_TRANSITIONS[order.status] : [];
  });

  readonly pendingCount = computed(
    () => this.orders().filter((order) => order.status === OrderStatus.Pending).length,
  );

  async load(filter: Partial<OrderListFilter> = {}): Promise<void> {
    const next = { ...this.currentFilter(), ...filter };
    this.currentFilter.set(next);
    this.loadingList.set(true);
    try {
      const page = await firstValueFrom(this.ordersService.list(next));
      this.orders.set(page.items);
      this.totalCount.set(page.total);
    } finally {
      this.loadingList.set(false);
    }
  }

  async select(id: string): Promise<void> {
    if (this.selectedOrder()?.id === id) return;
    this.loadingDetail.set(true);
    this.selectedOrder.set(null);
    this.selectedHistory.set([]);
    try {
      const [order, history] = await Promise.all([
        firstValueFrom(this.ordersService.get(id)),
        firstValueFrom(this.ordersService.history(id)),
      ]);
      this.selectedOrder.set(order);
      this.selectedHistory.set(history);
    } finally {
      this.loadingDetail.set(false);
    }
  }

  clearSelection(): void {
    this.selectedOrder.set(null);
    this.selectedHistory.set([]);
  }

  async transition(status: OrderStatus, reason?: string): Promise<OrderDto | null> {
    const order = this.selectedOrder();
    if (!order || !canTransition(order.status, status)) {
      return null;
    }
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.ordersService.transition(order.id, status, reason));
      this.selectedOrder.set(updated);
      this.orders.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
      const history = await firstValueFrom(this.ordersService.history(order.id));
      this.selectedHistory.set(history);
      return updated;
    } catch (error) {
      this.ordersService.raiseAlert({
        orderId: order.id,
        kind: 'transition_failed',
        message: error instanceof Error ? error.message : 'Transition failed',
      });
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  upsert(order: OrderDto): void {
    this.orders.update((list) => {
      const exists = list.some((item) => item.id === order.id);
      return exists ? list.map((item) => (item.id === order.id ? order : item)) : [order, ...list];
    });
    if (this.selectedOrder()?.id === order.id) {
      this.selectedOrder.set(order);
    }
  }
}
