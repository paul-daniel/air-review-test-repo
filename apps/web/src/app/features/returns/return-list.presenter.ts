import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ReturnStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import type { ReturnDto, ReturnListFilter } from './return.models';

export type ReturnAction = 'approve' | 'reject' | 'receive' | 'refund';

export interface ReturnActionEvent {
  readonly item: ReturnDto;
  readonly action: ReturnAction;
  readonly note?: string;
}

@Component({
  selector: 'atl-return-list-presenter',
  standalone: true,
  imports: [TranslatePipe, MoneyPipe, DatePipe, StatusBadgeComponent, PaginationComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-list.presenter.html',
  styles: `
    .actions { display: flex; gap: 6px; }
    .lines { color: var(--atl-muted); font-size: 12px; }
    textarea { width: 100%; margin-top: 8px; }
  `,
})
export class ReturnListPresenter {
  readonly returns = input.required<readonly ReturnDto[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly busyId = input<string | null>(null);
  readonly filter = input.required<ReturnListFilter>();
  readonly canDecide = input(false);
  readonly canReceive = input(false);
  readonly canRefund = input(false);

  readonly statusChange = output<ReturnStatus | null>();
  readonly pageChange = output<number>();
  readonly action = output<ReturnActionEvent>();
  readonly openOrder = output<string>();

  protected readonly statuses = Object.values(ReturnStatus);
  protected readonly Status = ReturnStatus;
  protected readonly rejecting = signal<ReturnDto | null>(null);
  protected readonly rejectNote = signal('');

  protected onStatusSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusChange.emit(value ? (value as ReturnStatus) : null);
  }

  protected emit(item: ReturnDto, action: ReturnAction): void {
    if (action === 'reject') {
      this.rejectNote.set('');
      this.rejecting.set(item);
      return;
    }
    this.action.emit({ item, action });
  }

  protected onRejectNoteInput(event: Event): void {
    this.rejectNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected confirmReject(): void {
    const item = this.rejecting();
    const note = this.rejectNote().trim();
    if (!item || !note) return;
    this.rejecting.set(null);
    this.action.emit({ item, action: 'reject', note });
  }

  protected summary(item: ReturnDto): string {
    return item.lines.map((line) => `${line.quantity} × ${line.sku}`).join(', ');
  }
}
