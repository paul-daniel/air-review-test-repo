import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { formatOrderReference, type OrderStatus } from '@atlas/shared';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { OrderDetailPresenter } from './order-detail.presenter';
import { OrdersStore } from './orders.store';

@Component({
  selector: 'atl-order-detail',
  standalone: true,
  imports: [OrderDetailPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-order-detail-presenter
      [order]="store.selected()"
      [history]="store.history()"
      [loading]="store.isLoadingDetail()"
      [busy]="store.isBusy()"
      [transitions]="canTransition ? store.availableTransitions() : []"
      (transition)="onTransition($event)"
      (back)="onBack()"
      (openCustomer)="onOpenCustomer($event)"
    />
  `,
})
export class OrderDetailContainer {
  protected readonly store = inject(OrdersStore);

  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canTransition = this.auth.hasRole('admin', 'ops', 'support');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id !== null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.store.select(id).catch(() => void this.router.navigate(['/orders']));
      });
    this.destroyRef.onDestroy(() => this.store.clearSelection());
  }

  protected async onTransition(event: { status: OrderStatus; reason?: string }): Promise<void> {
    try {
      const updated = await this.store.transition(event.status, event.reason);
      if (updated) {
        this.notifications.success(
          this.translate.instant('orders.detail.transitioned', {
            reference: formatOrderReference(updated),
            status: this.translate.instant(`orders.status.${updated.status.toLowerCase()}`),
          }),
        );
      }
    } catch {
      this.notifications.error(this.translate.instant('orders.detail.transitionFailed'));
    }
  }

  protected onBack(): void {
    void this.router.navigate(['/orders']);
  }

  protected onOpenCustomer(customerId: string): void {
    void this.router.navigate(['/customers', customerId]);
  }
}
