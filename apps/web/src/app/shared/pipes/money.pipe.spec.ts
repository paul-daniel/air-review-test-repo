import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslateService } from '../../core/i18n/translate.service';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const locale = signal<'en' | 'fr' | 'de'>('en');

  beforeEach(() => {
    locale.set('en');
    TestBed.configureTestingModule({
      providers: [MoneyPipe, { provide: TranslateService, useValue: { locale } }],
    });
  });

  it('formats minor units with the active locale', () => {
    const pipe = TestBed.inject(MoneyPipe);
    expect(pipe.transform(1999, 'EUR')).toBe('€19.99');
    locale.set('de');
    expect(pipe.transform(1999, 'EUR')).toMatch(/^19,99\s€$/);
  });

  it('accepts Money objects and empty values', () => {
    const pipe = TestBed.inject(MoneyPipe);
    expect(pipe.transform({ amountMinor: 250, currency: 'GBP' })).toBe('£2.50');
    expect(pipe.transform(null)).toBe('');
  });
});
