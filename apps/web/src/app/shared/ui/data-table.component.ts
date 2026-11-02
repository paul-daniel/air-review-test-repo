import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface TableColumn<T> {
  readonly key: string;
  readonly labelKey: string;
  readonly sortable?: boolean;
  readonly align?: 'left' | 'right';
  readonly value: (row: T) => string | number;
}

export interface SortState {
  readonly key: string;
  readonly direction: 'asc' | 'desc';
}

@Component({
  selector: 'atl-data-table',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="atl-table">
      <thead>
        <tr>
          @for (column of columns(); track column.key) {
            <th
              [class.sortable]="column.sortable"
              [class.right]="column.align === 'right'"
              (click)="column.sortable && toggleSort(column.key)"
            >
              {{ column.labelKey | translate }}
              @if (sort()?.key === column.key) {
                <span class="sort-indicator">{{ sort()?.direction === 'asc' ? '▲' : '▼' }}</span>
              }
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td [attr.colspan]="columns().length" class="muted">{{ 'common.loading' | translate }}</td></tr>
        } @else if (rows().length === 0) {
          <tr><td [attr.colspan]="columns().length" class="muted">{{ emptyKey() | translate }}</td></tr>
        } @else {
          @for (row of rows(); track trackBy()(row)) {
            <tr (click)="rowClick.emit(row)" [class.clickable]="true">
              @for (column of columns(); track column.key) {
                <td [class.right]="column.align === 'right'">{{ column.value(row) }}</td>
              }
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: `
    .atl-table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; border-bottom: 1px solid var(--atl-border); text-align: left; }
    th.sortable { cursor: pointer; user-select: none; }
    .right { text-align: right; }
    .muted { color: var(--atl-muted); text-align: center; }
    tr.clickable:hover td { background: var(--atl-bg); cursor: pointer; }
    .sort-indicator { font-size: 10px; margin-left: 4px; }
  `,
})
export class DataTableComponent<T> {
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly trackBy = input.required<(row: T) => string>();
  readonly loading = input(false);
  readonly emptyKey = input('common.empty');
  readonly sort = input<SortState | null>(null);

  readonly rowClick = output<T>();
  readonly sortChange = output<SortState>();

  protected toggleSort(key: string): void {
    const current = this.sort();
    const direction = current?.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key, direction });
  }
}
