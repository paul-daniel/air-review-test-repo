import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CUSTOMER_TIERS, PROMOTION_KINDS, type PromotionKind } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { PromotionDraft } from './promotion.models';

@Component({
  selector: 'atl-promotion-editor-presenter',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotion-editor.presenter.html',
  styles: `
    .tiers { display: flex; gap: 12px; flex-wrap: wrap; }
    .tiers label { display: inline-flex; gap: 4px; align-items: center; }
    .hint { color: var(--atl-muted); font-size: 12px; }
  `,
})
export class PromotionEditorPresenter {
  readonly submitting = input(false);

  readonly submitDraft = output<PromotionDraft>();
  readonly cancel = output<void>();

  protected readonly kinds = PROMOTION_KINDS;
  protected readonly tiers = CUSTOMER_TIERS;
  protected readonly selectedTiers = signal<readonly string[]>([]);

  protected readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(32), Validators.pattern(/^[A-Za-z0-9 _-]+$/)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    kind: new FormControl<PromotionKind>('percent', { nonNullable: true }),
    value: new FormControl(10, { nonNullable: true, validators: [Validators.min(0)] }),
    minSubtotalMinor: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    startsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    usageLimit: new FormControl<number | null>(null),
  });

  protected readonly valueLabelKey = computed(() => `promotions.editor.value.${this.form.controls.kind.value}`);
  protected readonly needsValue = computed(() => this.form.controls.kind.value !== 'free_shipping');

  protected toggleTier(tier: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTiers.update((tiers) => (checked ? [...tiers, tier] : tiers.filter((t) => t !== tier)));
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) return;
    const raw = this.form.getRawValue();
    this.submitDraft.emit({
      code: raw.code,
      name: raw.name,
      kind: raw.kind,
      value: raw.kind === 'free_shipping' ? 0 : raw.value,
      minSubtotalMinor: raw.minSubtotalMinor,
      tiers: this.selectedTiers(),
      startsAt: new Date(raw.startsAt).toISOString(),
      endsAt: new Date(raw.endsAt).toISOString(),
      usageLimit: raw.usageLimit,
    });
  }
}
