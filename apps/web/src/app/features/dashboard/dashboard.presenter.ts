import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OrderStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import type { DashboardKpis } from './kpi.service';

@Component({
  selector: 'atl-dashboard-presenter',
  standalone: true,
  imports: [TranslatePipe, MoneyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.presenter.html',
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .kpi { cursor: pointer; }
    .kpi .value { font-size: 28px; font-weight: 600; }
    .kpi .label { color: var(--atl-muted); font-size: 12px; }
    .tickets { display: flex; gap: 12px; }
  `,
})
export class DashboardPresenter {
  readonly kpis = input.required<DashboardKpis | null>();
  readonly lastRefreshed = input<Date | null>(null);
  readonly error = input(false);

  readonly refresh = output<void>();
  readonly openOrders = output<string | null>();

  protected readonly pendingStatus = OrderStatus.Pending;
  protected readonly ticketPriorities = ['P1', 'P2', 'P3', 'P4'] as const;
  protected readonly totalOpenTickets = computed(() => {
    const tickets = this.kpis()?.openTickets;
    return tickets ? tickets.P1 + tickets.P2 + tickets.P3 + tickets.P4 : 0;
  });
}
