import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { PromotionEditorPresenter } from './promotion-editor.presenter';
import type { PromotionDraft } from './promotion.models';
import { PromotionsService } from './promotions.service';
import { PromotionsStore } from './promotions.store';

@Component({
  selector: 'atl-promotion-editor',
  standalone: true,
  imports: [PromotionEditorPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-promotion-editor-presenter [submitting]="submitting()" (submitDraft)="onSubmit($event)" (cancel)="onCancel()" />
  `,
})
export class PromotionEditorContainer {
  protected readonly submitting = signal(false);

  private readonly promotionsService = inject(PromotionsService);
  private readonly store = inject(PromotionsStore);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected onSubmit(draft: PromotionDraft): void {
    this.submitting.set(true);
    this.promotionsService
      .create(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (promotion) => {
          this.submitting.set(false);
          this.store.upsert(promotion);
          this.notifications.success(this.translate.instant('promotions.editor.created', { code: promotion.code }));
          void this.router.navigate(['/promotions']);
        },
        error: () => this.submitting.set(false),
      });
  }

  protected onCancel(): void {
    void this.router.navigate(['/promotions']);
  }
}
