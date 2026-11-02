import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { isOrderStatus, type OrderStatus } from '@atlas/shared';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { searchTerm } from '../../shared/utils/debounce';
import { readListParams } from '../../shared/utils/query-params';
import { OrderListPresenter } from './order-list.presenter';
import type { OrderSummaryDto } from './order.models';
import { OrdersStore } from './orders.store';

@Component({
  selector: 'atl-order-list',
  standalone: true,
  imports: [OrderListPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-order-list-presenter
      [orders]="store.items()"
      [total]="store.total()"
      [loading]="store.isLoadingList()"
      [filter]="store.filter()"
      [canCreate]="canCreate"
      (searchChange)="searchInput$.next($event)"
      (statusChange)="onStatus($event)"
      (pageChange)="onPage($event)"
      (orderSelected)="onSelect($event)"
      (createRequested)="onCreate()"
    />
  `,
})
export class OrderListContainer {
  protected readonly store = inject(OrdersStore);
  protected readonly searchInput$ = new Subject<string>();

  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canCreate = this.auth.hasRole('admin', 'ops');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const list = readListParams(params);
      const status = params.get('status');
      void this.store.load({
        customerId: params.get('customerId'),
        status: status && isOrderStatus(status) ? status : null,
        search: list.search,
        page: list.page,
        pageSize: list.pageSize,
      });
    });

    this.searchInput$
      .pipe(searchTerm(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => void this.navigate({ search }));
  }

  protected onStatus(status: OrderStatus | null): void {
    void this.navigate({ status, page: 1 });
  }

  protected onPage(page: number): void {
    void this.navigate({ page });
  }

  protected onSelect(order: OrderSummaryDto): void {
    void this.router.navigate(['/orders', order.id]);
  }

  protected onCreate(): void {
    void this.router.navigate(['/orders/new']);
  }

  private navigate(patch: { search?: string; status?: OrderStatus | null; page?: number }): Promise<boolean> {
    const current = this.store.filter();
    const next = { ...current, ...patch };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: next.search || null,
        status: next.status,
        page: next.page > 1 ? next.page : null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
