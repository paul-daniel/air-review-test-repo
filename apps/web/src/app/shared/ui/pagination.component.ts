import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'atl-pagination',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagination">
      <span class="muted">{{ 'common.pagination.summary' | translate: summaryParams() }}</span>
      <button type="button" class="atl-btn" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">
        {{ 'common.pagination.previous' | translate }}
      </button>
      <button type="button" class="atl-btn" [disabled]="page() >= pageCount()" (click)="pageChange.emit(page() + 1)">
        {{ 'common.pagination.next' | translate }}
      </button>
    </div>
  `,
  styles: `
    .pagination { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 12px; }
    .muted { color: var(--atl-muted); margin-right: auto; }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly summaryParams = computed(() => {
    const from = this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(this.total(), this.page() * this.pageSize());
    return { from, to, total: this.total() };
  });
}
