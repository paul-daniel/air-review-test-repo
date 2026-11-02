import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import type { OrderDto } from '../orders/order.models';
import { OrdersService } from '../orders/orders.service';
import { ReturnRequestPresenter } from './return-request.presenter';
import type { ReturnRequest } from './return.models';
import { ReturnsService } from './returns.service';
import { ReturnsStore } from './returns.store';

@Component({
  selector: 'atl-return-request',
  standalone: true,
  imports: [ReturnRequestPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-return-request-presenter
      [order]="order()"
      [alreadyReturned]="alreadyReturned()"
      [submitting]="submitting()"
      (submitRequest)="onSubmit($event)"
      (cancel)="onCancel()"
    />
  `,
})
export class ReturnRequestContainer {
  protected readonly order = signal<OrderDto | null>(null);
  protected readonly alreadyReturned = signal<ReadonlyMap<string, number>>(new Map());
  protected readonly submitting = signal(false);

  private readonly ordersService = inject(OrdersService);
  private readonly returnsService = inject(ReturnsService);
  private readonly store = inject(ReturnsStore);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const orderId$ = this.route.paramMap.pipe(
      map((params) => params.get('orderId')),
      filter((id): id is string => id !== null),
    );

    orderId$
      .pipe(
        switchMap((id) => this.ordersService.get(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (order) => this.order.set(order),
        error: () => void this.router.navigate(['/returns']),
      });

    orderId$
      .pipe(
        switchMap((id) => this.returnsService.list({ status: null, customerId: null, orderId: id, page: 1, pageSize: 100 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        const totals = new Map<string, number>();
        for (const item of page.items) {
          if (item.status === 'REJECTED') continue;
          for (const line of item.lines) {
            totals.set(line.orderLineId, (totals.get(line.orderLineId) ?? 0) + line.quantity);
          }
        }
        this.alreadyReturned.set(totals);
      });
  }

  protected onSubmit(request: ReturnRequest): void {
    this.submitting.set(true);
    this.returnsService
      .request(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.store.upsert(created);
          this.notifications.success(this.translate.instant('returns.request.created', { reference: created.reference }));
          void this.router.navigate(['/returns'], { queryParams: { orderId: created.orderId } });
        },
        error: () => this.submitting.set(false),
      });
  }

  protected onCancel(): void {
    const order = this.order();
    void this.router.navigate(order ? ['/orders', order.id] : ['/returns']);
  }
}
