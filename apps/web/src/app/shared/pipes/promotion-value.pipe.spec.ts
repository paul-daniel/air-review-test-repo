import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslateService } from '../../core/i18n/translate.service';
import { MoneyPipe } from './money.pipe';
import { PromotionValuePipe } from './promotion-value.pipe';

describe('PromotionValuePipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PromotionValuePipe,
        MoneyPipe,
        { provide: TranslateService, useValue: { locale: signal('en'), instant: (key: string) => key } },
      ],
    });
  });

  it('renders each promotion kind', () => {
    const pipe = TestBed.inject(PromotionValuePipe);
    expect(pipe.transform({ kind: 'percent', value: 15 })).toBe('15 %');
    expect(pipe.transform({ kind: 'fixed', value: 2000 })).toBe('€20.00');
    expect(pipe.transform({ kind: 'free_shipping', value: 0 })).toBe('promotions.kinds.free_shipping');
    expect(pipe.transform(null)).toBe('');
  });
});
