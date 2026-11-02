import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderStatus, refundForLine, RETURN_REASONS, RETURN_WINDOW_DAYS, type ReturnReason } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import type { OrderDto, OrderLineDto } from '../orders/order.models';
import type { ReturnRequest, ReturnRequestLine } from './return.models';

interface LineSelection {
  readonly orderLineId: string;
  readonly quantity: number;
  readonly reason: ReturnReason;
}

@Component({
  selector: 'atl-return-request-presenter',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-request.presenter.html',
  styles: `
    .qty { width: 64px; }
    .estimate { text-align: right; font-weight: 600; }
    .notice { color: var(--atl-warning); }
  `,
})
export class ReturnRequestPresenter {
  readonly order = input.required<OrderDto | null>();
  readonly alreadyReturned = input<ReadonlyMap<string, number>>(new Map());
  readonly submitting = input(false);

  readonly submitRequest = output<ReturnRequest>();
  readonly cancel = output<void>();

  protected readonly reasons = RETURN_REASONS;
  protected readonly windowDays = RETURN_WINDOW_DAYS;
  protected readonly selections = signal<readonly LineSelection[]>([]);
  protected readonly form = new FormGroup({
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  protected readonly returnable = computed(() => this.order()?.status === OrderStatus.Delivered);

  protected readonly lines = computed(() =>
    (this.order()?.lines ?? []).map((line) => ({
      line,
      remaining: line.quantity - (this.alreadyReturned().get(line.id) ?? 0),
      selection: this.selections().find((selection) => selection.orderLineId === line.id) ?? null,
    })),
  );

  protected readonly estimateMinor = computed(() => {
    const order = this.order();
    if (!order) return 0;
    return this.selections().reduce((sum, selection) => {
      const line = order.lines.find((candidate) => candidate.id === selection.orderLineId);
      if (!line) return sum;
      return (
        sum +
        refundForLine({
          orderedQuantity: line.quantity,
          returnedQuantity: selection.quantity,
          unitPriceMinor: line.unitPriceMinor,
          lineDiscountMinor: line.discountMinor,
        }).refundMinor
      );
    }, 0);
  });

  protected readonly canSubmit = computed(() => this.returnable() && this.selections().length > 0 && !this.submitting());

  constructor() {
    effect(() => {
      this.order();
      this.selections.set([]);
      this.form.reset();
    });
  }

  protected toggle(line: OrderLineDto, remaining: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selections.update((current) => {
      const without = current.filter((selection) => selection.orderLineId !== line.id);
      return checked && remaining > 0
        ? [...without, { orderLineId: line.id, quantity: Math.min(1, remaining), reason: 'other' }]
        : without;
    });
  }

  protected setQuantity(lineId: string, remaining: number, event: Event): void {
    const parsed = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const quantity = Number.isInteger(parsed) ? Math.min(remaining, Math.max(1, parsed)) : 1;
    this.selections.update((current) =>
      current.map((selection) => (selection.orderLineId === lineId ? { ...selection, quantity } : selection)),
    );
  }

  protected setReason(lineId: string, event: Event): void {
    const reason = (event.target as HTMLSelectElement).value as ReturnReason;
    this.selections.update((current) =>
      current.map((selection) => (selection.orderLineId === lineId ? { ...selection, reason } : selection)),
    );
  }

  protected submit(): void {
    const order = this.order();
    if (!order || !this.canSubmit() || this.form.invalid) return;
    const lines: ReturnRequestLine[] = this.selections().map((selection) => ({
      orderLineId: selection.orderLineId,
      quantity: selection.quantity,
      reason: selection.reason,
    }));
    const note = this.form.controls.note.value.trim();
    this.submitRequest.emit({ orderId: order.id, lines, ...(note ? { note } : {}) });
  }
}
