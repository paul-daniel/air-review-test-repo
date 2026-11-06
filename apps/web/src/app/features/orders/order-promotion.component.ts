import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NotificationService } from '../../core/notification.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import type { PromotionPreviewDto } from '../promotions/promotion.models';
import { PromotionsService } from '../promotions/promotions.service';

/** Shows what a promo code would do to the draft order while the user types it. */
@Component({
  selector: 'atl-order-promotion',
  standalone: true,
  imports: [TranslatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (preview(); as preview) {
      @if (preview.applies) {
        <p class="preview ok">
          {{ 'orders.editor.promotion.applies' | translate: { code: preview.code } }}
          @if (preview.freeShipping) {
            <strong>{{ 'orders.editor.promotion.freeShipping' | translate }}</strong>
          } @else {
            <strong>− {{ preview.discountMinor | money: currency() }}</strong>
          }
        </p>
      } @else {
        <p class="preview ko">{{ 'orders.editor.promotion.rejected.' + (preview.reason ?? 'unknown_code') | translate }}</p>
      }
    }
  `,
  styles: `
    .preview { margin: 4px 0 0; font-size: 13px; }
    .ok { color: var(--atl-success); }
    .ko { color: var(--atl-danger); }
  `,
})
export class OrderPromotionComponent {
  readonly code = input('');
  readonly subtotalMinor = input(0);
  readonly tier = input('standard');
  readonly currency = input<'EUR' | 'GBP' | 'USD'>('EUR');

  protected readonly preview = signal<PromotionPreviewDto | null>(null);

  private readonly promotions = inject(PromotionsService);
  private readonly notifications = inject(NotificationService);

  constructor() {
    effect(() => {
      const code = this.code().trim();
      if (code.length < 3) {
        this.preview.set(null);
        return;
      }
      this.promotions.preview(code, this.subtotalMinor(), this.tier()).subscribe({
        next: (preview) => this.preview.set(preview),
        error: () => this.notifications.error('Could not check the promo code'),
      });
    });
  }
}
