import type { Customer, Product } from '@atlas/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { PricingRulesRepository } from './pricing.repository';
import { PricingService } from './pricing.service';

const customer = (tier: Customer['tier']): Customer => ({
  id: `cus_${tier}`,
  email: `${tier}@example.com`,
  firstName: 'T',
  lastName: tier,
  tier,
  billingAddress: { line1: 'x', postalCode: '75001', city: 'Paris', countryCode: 'FR' },
  marketingOptIn: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const product = (id: string, amountMinor: number, active = true): Product => ({
  id,
  sku: id.toUpperCase(),
  name: id,
  description: '',
  category: 'apparel',
  price: { amountMinor, currency: 'EUR' },
  taxRatePercent: 20,
  variants: [],
  active,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('PricingService', () => {
  let service: PricingService;
  const customers = new Map([
    ['cus_standard', customer('standard')],
    ['cus_gold', customer('gold')],
  ]);
  const products = new Map([
    ['prd_tee', product('prd_tee', 2500)],
    ['prd_hoodie', product('prd_hoodie', 6000)],
    ['prd_retired', product('prd_retired', 100, false)],
  ]);

  beforeEach(() => {
    service = new PricingService(new PricingRulesRepository(), {
      findCustomer: (id) => customers.get(id),
      findProduct: (id) => products.get(id),
      freeShippingThresholdMinor: 7500,
      standardShippingMinor: 590,
      clock: () => '2026-06-01T00:00:00.000Z',
    });
  });

  it('computes totals for a standard customer below free shipping', () => {
    const result = service.quote({
      customerId: 'cus_standard',
      currency: 'EUR',
      shippingCountryCode: 'FR',
      lines: [{ productId: 'prd_tee', quantity: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totals).toEqual({
      subtotalMinor: 5000,
      discountMinor: 0,
      shippingMinor: 590,
      taxMinor: 1118,
      grandTotalMinor: 6708,
    });
  });

  it('applies the tier discount per line and free shipping above the threshold', () => {
    const result = service.quote({
      customerId: 'cus_gold',
      currency: 'EUR',
      shippingCountryCode: 'DE',
      lines: [{ productId: 'prd_hoodie', quantity: 2 }],
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.tierDiscountPercent).toBe(5);
    expect(result.value.lines[0]?.netMinor).toBe(11_400);
    expect(result.value.totals.shippingMinor).toBe(0);
    expect(result.value.totals.taxMinor).toBe(2166);
    expect(result.value.totals.grandTotalMinor).toBe(13_566);
  });

  it('applies a valid promo code after the tier discount', () => {
    const result = service.quote({
      customerId: 'cus_gold',
      currency: 'EUR',
      shippingCountryCode: 'US',
      lines: [{ productId: 'prd_hoodie', quantity: 2 }],
      promoCode: 'SUMMER15',
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.appliedPromo).toBe('SUMMER15');
    expect(result.value.totals.discountMinor).toBe(600 + 1710);
    expect(result.value.totals.grandTotalMinor).toBe(9690);
  });

  it('rejects expired, inactive or below-threshold promo codes', () => {
    const base = {
      customerId: 'cus_standard',
      currency: 'EUR' as const,
      shippingCountryCode: 'FR',
      lines: [{ productId: 'prd_tee', quantity: 1 }],
    };
    expect(service.quote({ ...base, promoCode: 'OLDCODE' }).ok).toBe(false);
    expect(service.quote({ ...base, promoCode: 'SUMMER15' }).ok).toBe(false);
    expect(service.quote({ ...base, promoCode: 'NOPE' }).ok).toBe(false);
  });

  it('rejects inactive products and unknown customers', () => {
    const retired = service.quote({
      customerId: 'cus_standard',
      currency: 'EUR',
      shippingCountryCode: 'FR',
      lines: [{ productId: 'prd_retired', quantity: 1 }],
    });
    expect(retired.ok).toBe(false);
    if (!retired.ok) expect(retired.error.code).toBe('INVALID_STATE');
    const ghost = service.quote({
      customerId: 'cus_ghost',
      currency: 'EUR',
      shippingCountryCode: 'FR',
      lines: [{ productId: 'prd_tee', quantity: 1 }],
    });
    expect(ghost.ok).toBe(false);
  });
});
