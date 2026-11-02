import { Pipe, inject, type PipeTransform } from '@angular/core';
import { formatMoney, type CurrencyCode, type Money } from '@atlas/shared';
import { TranslateService } from '../../core/i18n/translate.service';

const LOCALE_TAGS = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE' } as const;

/**
 * `{{ 1999 | money: 'EUR' }}` or `{{ order.totals.grandTotalMinor | money: order.currency }}`.
 * Accepts either a minor-unit integer plus currency or a Money object.
 */
@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: Money | number | null | undefined, currency: CurrencyCode = 'EUR'): string {
    if (value === null || value === undefined) {
      return '';
    }
    const money: Money = typeof value === 'number' ? { amountMinor: value, currency } : value;
    return formatMoney(money, LOCALE_TAGS[this.translate.locale()]);
  }
}
