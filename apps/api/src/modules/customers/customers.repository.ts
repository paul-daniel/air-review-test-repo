import type { Customer, CustomerTier } from '@atlas/shared';

export interface CustomerFilter {
  readonly search?: string;
  readonly tier?: CustomerTier;
}

export class CustomersRepository {
  private readonly customers = new Map<string, Customer>();

  constructor(seed: readonly Customer[] = []) {
    for (const customer of seed) {
      this.customers.set(customer.id, customer);
    }
  }

  findById(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  findByEmail(email: string): Customer | undefined {
    const normalized = email.toLowerCase();
    for (const customer of this.customers.values()) {
      if (customer.email === normalized) return customer;
    }
    return undefined;
  }

  findAll(filter: CustomerFilter = {}): Customer[] {
    const search = filter.search?.trim().toLowerCase();
    return [...this.customers.values()]
      .filter((customer) => (filter.tier ? customer.tier === filter.tier : true))
      .filter((customer) =>
        search
          ? customer.email.includes(search) ||
            `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search)
          : true,
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }

  save(customer: Customer): Customer {
    this.customers.set(customer.id, customer);
    return customer;
  }

  delete(id: string): boolean {
    return this.customers.delete(id);
  }

  count(): number {
    return this.customers.size;
  }
}

export function seedCustomers(): Customer[] {
  const at = '2026-01-10T09:00:00.000Z';
  return [
    {
      id: 'cus_01hv3k9f2x',
      email: 'amelie.durand@example.com',
      firstName: 'Amélie',
      lastName: 'Durand',
      tier: 'gold',
      billingAddress: { line1: '12 rue de la Paix', postalCode: '75002', city: 'Paris', countryCode: 'FR' },
      marketingOptIn: true,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'cus_01hv3k9g7q',
      email: 'jonas.weber@example.de',
      firstName: 'Jonas',
      lastName: 'Weber',
      tier: 'standard',
      billingAddress: { line1: 'Torstraße 101', postalCode: '10119', city: 'Berlin', countryCode: 'DE' },
      shippingAddress: { line1: 'Torstraße 101', line2: 'Hinterhaus', postalCode: '10119', city: 'Berlin', countryCode: 'DE' },
      marketingOptIn: false,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'cus_01hv3k9hb2',
      email: 'olivia.bennett@example.co.uk',
      firstName: 'Olivia',
      lastName: 'Bennett',
      tier: 'platinum',
      billingAddress: { line1: '4 Clerkenwell Road', postalCode: 'EC1M 5PA', city: 'London', countryCode: 'GB' },
      marketingOptIn: true,
      createdAt: at,
      updatedAt: at,
    },
  ];
}
