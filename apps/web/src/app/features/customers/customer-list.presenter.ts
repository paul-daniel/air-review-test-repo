import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CUSTOMER_TIERS } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { DataTableComponent, type TableColumn } from '../../shared/ui/data-table.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import type { CustomerListFilter, CustomerSummary, CustomerTier } from './customer.models';

/** Presenter: pure inputs/outputs, no injected services. */
@Component({
  selector: 'atl-customer-list-presenter',
  standalone: true,
  imports: [TranslatePipe, DataTableComponent, PaginationComponent],
  // Formatting pipes only (no services): they are used programmatically for table cells.
  providers: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.presenter.html',
})
export class CustomerListPresenter {
  readonly customers = input.required<readonly CustomerSummary[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly filter = input.required<CustomerListFilter>();

  readonly searchChange = output<string>();
  readonly tierChange = output<CustomerTier | null>();
  readonly pageChange = output<number>();
  readonly customerSelected = output<CustomerSummary>();

  protected readonly tiers = CUSTOMER_TIERS;
  protected readonly trackById = (row: CustomerSummary): string => row.id;

  protected readonly columns = computed<readonly TableColumn<CustomerSummary>[]>(() => [
    { key: 'fullName', labelKey: 'customers.list.columns.name', value: (row) => row.fullName },
    { key: 'email', labelKey: 'customers.list.columns.email', value: (row) => row.email },
    { key: 'tier', labelKey: 'customers.list.columns.tier', value: (row) => row.tier },
    { key: 'orderCount', labelKey: 'customers.list.columns.orders', align: 'right', value: (row) => row.orderCount },
    {
      key: 'lifetimeValueMinor',
      labelKey: 'customers.list.columns.lifetimeValue',
      align: 'right',
      value: (row) => this.money.transform(row.lifetimeValueMinor, 'EUR'),
    },
  ]);

  constructor(private readonly money: MoneyPipe) {}

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onTierSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.tierChange.emit(value ? (value as CustomerTier) : null);
  }
}
