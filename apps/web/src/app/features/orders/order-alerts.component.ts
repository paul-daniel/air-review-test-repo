import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NotificationService } from '../../core/notification.service';
import type { OrderAlert } from './order.models';
import { OrdersService } from './orders.service';

const MAX_VISIBLE_ALERTS = 5;

/** Small banner listing the latest operational alerts raised while working with orders. */
@Component({
  selector: 'atl-order-alerts',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (alerts().length > 0) {
      <aside class="atl-card alerts">
        <h4>{{ 'orders.alerts.title' | translate }}</h4>
        <ul>
          @for (alert of alerts(); track alert.orderId + alert.kind) {
            <li [class]="alert.kind">{{ alert.message }}</li>
          }
        </ul>
        <button type="button" class="atl-btn" (click)="dismissAll()">{{ 'orders.alerts.dismiss' | translate }}</button>
      </aside>
    }
  `,
  styles: `
    .alerts { border-left: 4px solid var(--atl-warning); margin-bottom: 16px; }
    .transition_failed { color: var(--atl-danger); }
  `,
})
export class OrderAlertsComponent implements OnInit {
  protected readonly alerts = signal<readonly OrderAlert[]>([]);

  private readonly orders = inject(OrdersService);
  private readonly notifications = inject(NotificationService);

  ngOnInit(): void {
    this.orders.alerts$.subscribe(alert => this.handle(alert));
  }

  protected dismissAll(): void {
    this.alerts.set([]);
  }

  private handle(alert: OrderAlert): void {
    this.alerts.update((current) => [alert, ...current].slice(0, MAX_VISIBLE_ALERTS));
    if (alert.kind === 'transition_failed') {
      this.notifications.error(alert.message);
    }
  }
}
