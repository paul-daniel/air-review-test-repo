import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OrderStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { DataTableComponent, type TableColumn } from '../../shared/ui/data-table.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import type { OrderListFilter, OrderSummaryDto } from './order.models';

@Component({
  selector: 'atl-order-list-presenter',
  standalone: true,
  imports: [TranslatePipe, DataTableComponent, PaginationComponent],
  // Formatting pipes only (no services): they are used programmatically for table cells.
  providers: [MoneyPipe, DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.presenter.html',
})
export class OrderListPresenter {
  readonly orders = input.required<readonly OrderSummaryDto[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly filter = input.required<OrderListFilter>();
  readonly canCreate = input(false);

  readonly searchChange = output<string>();
  readonly statusChange = output<OrderStatus | null>();
  readonly pageChange = output<number>();
  readonly orderSelected = output<OrderSummaryDto>();
  readonly createRequested = output<void>();

  protected readonly statuses = Object.values(OrderStatus);
  protected readonly trackById = (row: OrderSummaryDto): string => row.id;

  protected readonly columns = computed<readonly TableColumn<OrderSummaryDto>[]>(() => [
    { key: 'reference', labelKey: 'orders.list.columns.reference', value: (row) => row.reference },
    { key: 'placedAt', labelKey: 'orders.list.columns.placedAt', value: (row) => this.date.transform(row.placedAt, 'medium') ?? '' },
    { key: 'status', labelKey: 'orders.list.columns.status', value: (row) => this.translate.transform(`orders.status.${row.status.toLowerCase()}`) },
    { key: 'lines', labelKey: 'orders.list.columns.lines', align: 'right', value: (row) => row.lines.length },
    { key: 'total', labelKey: 'orders.list.columns.total', align: 'right', value: (row) => this.money.transform(row.totals.grandTotalMinor, row.currency) },
  ]);

  constructor(
    private readonly money: MoneyPipe,
    private readonly date: DatePipe,
    private readonly translate: TranslatePipe,
  ) {}

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onStatusSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusChange.emit(value ? (value as OrderStatus) : null);
  }
}
