import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'atl-confirm-dialog',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancelled.emit()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="titleKey() | translate">
        <h3>{{ titleKey() | translate }}</h3>
        <p>{{ messageKey() | translate: messageParams() }}</p>
        <div class="actions">
          <button type="button" class="atl-btn" (click)="cancelled.emit()">{{ 'common.actions.cancel' | translate }}</button>
          <button type="button" class="atl-btn" [class.danger]="destructive()" [class.primary]="!destructive()" (click)="confirmed.emit()">
            {{ confirmKey() | translate }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); }
    .dialog { position: fixed; top: 30%; left: 50%; transform: translateX(-50%); width: 420px; background: var(--atl-surface); border-radius: var(--atl-radius); padding: 20px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly titleKey = input.required<string>();
  readonly messageKey = input.required<string>();
  readonly messageParams = input<Record<string, string | number>>({});
  readonly confirmKey = input('common.actions.confirm');
  readonly destructive = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
