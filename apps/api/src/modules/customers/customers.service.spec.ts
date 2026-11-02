import { beforeEach, describe, expect, it } from 'vitest';
import { CustomersRepository, seedCustomers } from './customers.repository';
import { CustomersService } from './customers.service';
import { validateCreateCustomer } from './customers.validation';

const stats = new Map<string, { orderCount: number; lifetimeValueMinor: number }>([
  ['cus_01hv3k9f2x', { orderCount: 4, lifetimeValueMinor: 48_900 }],
]);

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(() => {
    service = new CustomersService(
      new CustomersRepository(seedCustomers()),
      { statsFor: (id) => stats.get(id) ?? { orderCount: 0, lifetimeValueMinor: 0 } },
      () => '2026-05-01T10:00:00.000Z',
    );
  });

  it('lists customers sorted by name with order stats', () => {
    const result = service.list({ page: 1, pageSize: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(3);
    expect(result.value.items.map((c) => c.fullName)).toEqual(['Olivia Bennett', 'Amélie Durand', 'Jonas Weber']);
    expect(result.value.items[1]?.orderCount).toBe(4);
  });

  it('filters by tier and search', () => {
    const byTier = service.list({ page: 1, pageSize: 10, tier: 'gold' });
    const bySearch = service.list({ page: 1, pageSize: 10, search: 'weber' });
    expect(byTier.ok && byTier.value.items.map((c) => c.id)).toEqual(['cus_01hv3k9f2x']);
    expect(bySearch.ok && bySearch.value.items.map((c) => c.id)).toEqual(['cus_01hv3k9g7q']);
  });

  it('creates a customer from a validated dto', () => {
    const validation = validateCreateCustomer({
      email: 'New.Person@Example.com',
      firstName: 'New',
      lastName: 'Person',
      billingAddress: { line1: '1 Main St', postalCode: '1000', city: 'Brussels', countryCode: 'BE' },
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid || !validation.value) return;
    const result = service.create(validation.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.email).toBe('new.person@example.com');
    expect(result.value.tier).toBe('standard');
    expect(result.value.createdAt).toBe('2026-05-01T10:00:00.000Z');
  });

  it('rejects duplicate emails with a conflict', () => {
    const result = service.create({
      email: 'amelie.durand@example.com',
      firstName: 'A',
      lastName: 'D',
      billingAddress: { line1: 'x', postalCode: '75000', city: 'Paris', countryCode: 'FR' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  it('refuses to delete customers with orders', () => {
    const withOrders = service.remove('cus_01hv3k9f2x');
    const withoutOrders = service.remove('cus_01hv3k9g7q');
    expect(withOrders.ok).toBe(false);
    expect(withoutOrders.ok).toBe(true);
    expect(service.getById('cus_01hv3k9g7q').ok).toBe(false);
  });

  it('clears the shipping address when null is sent', () => {
    const result = service.update('cus_01hv3k9g7q', { shippingAddress: null });
    expect(result.ok && result.value.shippingAddress).toBeUndefined();
  });
});
