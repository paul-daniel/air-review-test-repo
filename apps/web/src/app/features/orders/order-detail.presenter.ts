import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { OrderStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import type { OrderDto, OrderEventDto } from './order.models';

export interface TransitionRequest {
  readonly status: OrderStatus;
  readonly reason?: string;
}

@Component({
  selector: 'atl-order-detail-presenter',
  standalone: true,
  imports: [TranslatePipe, MoneyPipe, DatePipe, StatusBadgeComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-detail.presenter.html',
  styles: `
    .totals { margin-left: auto; width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 600; border-top: 1px solid var(--atl-border); margin-top: 4px; padding-top: 8px; }
    .history li { color: var(--atl-muted); font-size: 13px; }
  `,
})
export class OrderDetailPresenter {
  readonly order = input.required<OrderDto | null>();
  readonly history = input<readonly OrderEventDto[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly transitions = input<readonly OrderStatus[]>([]);

  readonly transition = output<TransitionRequest>();
  readonly back = output<void>();
  readonly openCustomer = output<string>();
  readonly requestReturn = output<string>();

  protected readonly cancelStatus = OrderStatus.Cancelled;
  protected readonly deliveredStatus = OrderStatus.Delivered;
  protected readonly pendingCancel = signal(false);

  protected request(status: OrderStatus): void {
    if (status === OrderStatus.Cancelled) {
      this.pendingCancel.set(true);
      return;
    }
    this.transition.emit({ status });
  }

  protected confirmCancel(): void {
    this.pendingCancel.set(false);
    this.transition.emit({ status: OrderStatus.Cancelled, reason: 'Cancelled from back-office' });
  }

  protected lineTotal(line: OrderDto['lines'][number]): number {
    return line.unitPriceMinor * line.quantity - line.discountMinor;
  }
}
