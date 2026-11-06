import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PROMOTION_STATUSES, type PromotionStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PromotionValuePipe } from '../../shared/pipes/promotion-value.pipe';
import { DataTableComponent, type TableColumn } from '../../shared/ui/data-table.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import type { PromotionListFilter, PromotionSummaryDto } from './promotion.models';

@Component({
  selector: 'atl-promotion-list-presenter',
  standalone: true,
  imports: [TranslatePipe, DataTableComponent, PaginationComponent, StatusBadgeComponent],
  providers: [PromotionValuePipe, DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotion-list.presenter.html',
  styles: `
    .usage { font-variant-numeric: tabular-nums; }
    .archive { margin-left: 8px; }
  `,
})
export class PromotionListPresenter {
  readonly promotions = input.required<readonly PromotionSummaryDto[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly filter = input.required<PromotionListFilter>();
  readonly canManage = input(false);

  readonly searchChange = output<string>();
  readonly statusChange = output<PromotionStatus | null>();
  readonly pageChange = output<number>();
  readonly archiveRequested = output<PromotionSummaryDto>();
  readonly createRequested = output<void>();

  protected readonly statuses = PROMOTION_STATUSES;
  protected readonly trackById = (row: PromotionSummaryDto): string => row.id;

  protected readonly columns = computed<readonly TableColumn<PromotionSummaryDto>[]>(() => [
    { key: 'code', labelKey: 'promotions.list.columns.code', value: (row) => row.code },
    { key: 'name', labelKey: 'promotions.list.columns.name', value: (row) => row.name },
    { key: 'value', labelKey: 'promotions.list.columns.value', align: 'right', value: (row) => this.valuePipe.transform(row) },
    { key: 'status', labelKey: 'promotions.list.columns.status', value: (row) => this.translate.transform(`promotions.status.${row.status}`) },
    { key: 'usage', labelKey: 'promotions.list.columns.usage', align: 'right', value: (row) => (row.usageLimit === null ? `${row.usageCount}` : `${row.usageCount} / ${row.usageLimit}`) },
    { key: 'endsAt', labelKey: 'promotions.list.columns.endsAt', value: (row) => this.date.transform(row.endsAt, 'mediumDate') ?? '' },
  ]);

  constructor(
    private readonly valuePipe: PromotionValuePipe,
    private readonly date: DatePipe,
    private readonly translate: TranslatePipe,
  ) {}

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onStatusSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusChange.emit(value ? (value as PromotionStatus) : null);
  }
}
