import { Pipe, inject, type PipeTransform } from '@angular/core';
import type { PromotionKind } from '@atlas/shared';
import { TranslateService } from '../../core/i18n/translate.service';
import { MoneyPipe } from './money.pipe';

/** `{{ promotion | promotionValue }}` → "15 %", "€20.00" or the translated "Free shipping". */
@Pipe({ name: 'promotionValue', standalone: true, pure: false })
export class PromotionValuePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly money = inject(MoneyPipe);

  transform(promotion: { readonly kind: PromotionKind; readonly value: number } | null | undefined): string {
    if (!promotion) return '';
    switch (promotion.kind) {
      case 'percent':
        return `${promotion.value} %`;
      case 'fixed':
        return this.money.transform(promotion.value, 'EUR');
      case 'free_shipping':
        return this.translate.instant('promotions.kinds.free_shipping');
    }
  }
}
