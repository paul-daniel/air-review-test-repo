import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_TONES: Readonly<Record<string, BadgeTone>> = {
  [OrderStatus.Draft]: 'neutral',
  [OrderStatus.Pending]: 'info',
  [OrderStatus.Paid]: 'info',
  [OrderStatus.Shipped]: 'warning',
  [OrderStatus.Delivered]: 'success',
  [OrderStatus.Cancelled]: 'danger',
  active: 'success',
  inactive: 'neutral',
  draft: 'neutral',
  scheduled: 'info',
  live: 'success',
  expired: 'warning',
  archived: 'neutral',
};

@Component({
  selector: 'atl-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge ' + tone()">{{ labelKey() | translate }}</span>`,
  styles: `
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .neutral { background: #eaeef2; color: var(--atl-muted); }
    .info { background: #ddf4ff; color: #0969da; }
    .success { background: #dafbe1; color: var(--atl-success); }
    .warning { background: #fff8c5; color: var(--atl-warning); }
    .danger { background: #ffebe9; color: var(--atl-danger); }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly namespace = input('orders.status');

  protected readonly tone = computed<BadgeTone>(() => STATUS_TONES[this.status()] ?? 'neutral');
  protected readonly labelKey = computed(() => `${this.namespace()}.${this.status().toLowerCase()}`);
}
