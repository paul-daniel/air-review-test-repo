import { createId, customerFullName, nowIso, type Customer, type CustomerSummary } from '@atlas/shared';
import { conflict, err, notFound, ok, type Result } from '../../lib/result';
import type { CreateCustomerDto, CustomerListQuery, PagedResponse, UpdateCustomerDto } from './customers.dto';
import type { CustomersRepository } from './customers.repository';

export interface CustomerOrderStats {
  statsFor(customerId: string): { readonly orderCount: number; readonly lifetimeValueMinor: number };
}

export class CustomersService {
  constructor(
    private readonly repository: CustomersRepository,
    private readonly orderStats: CustomerOrderStats,
    private readonly clock: () => string = nowIso,
  ) {}

  list(query: CustomerListQuery): Result<PagedResponse<CustomerSummary>> {
    const filter = {
      ...(query.search !== undefined ? { search: query.search } : {}),
      ...(query.tier !== undefined ? { tier: query.tier } : {}),
    };
    const all = this.repository.findAll(filter);
    const start = (query.page - 1) * query.pageSize;
    const items = all.slice(start, start + query.pageSize).map((customer) => this.toSummary(customer));
    return ok({ items, page: query.page, pageSize: query.pageSize, total: all.length });
  }

  getById(id: string): Result<Customer> {
    const customer = this.repository.findById(id);
    return customer ? ok(customer) : err(notFound('Customer', id));
  }

  create(dto: CreateCustomerDto): Result<Customer> {
    if (this.repository.findByEmail(dto.email)) {
      return err(conflict(`A customer with email ${dto.email} already exists`));
    }
    const now = this.clock();
    const customer: Customer = {
      id: createId('cus'),
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      tier: dto.tier ?? 'standard',
      billingAddress: dto.billingAddress,
      ...(dto.shippingAddress ? { shippingAddress: dto.shippingAddress } : {}),
      marketingOptIn: dto.marketingOptIn ?? false,
      createdAt: now,
      updatedAt: now,
    };
    return ok(this.repository.save(customer));
  }

  update(id: string, dto: UpdateCustomerDto): Result<Customer> {
    const existing = this.repository.findById(id);
    if (!existing) return err(notFound('Customer', id));
    const { shippingAddress: existingShipping, ...rest } = existing;
    const shippingAddress =
      dto.shippingAddress === null ? undefined : (dto.shippingAddress ?? existingShipping);
    const updated: Customer = {
      ...rest,
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      tier: dto.tier ?? existing.tier,
      billingAddress: dto.billingAddress ?? existing.billingAddress,
      ...(shippingAddress ? { shippingAddress } : {}),
      marketingOptIn: dto.marketingOptIn ?? existing.marketingOptIn,
      updatedAt: this.clock(),
    };
    return ok(this.repository.save(updated));
  }

  remove(id: string): Result<void> {
    const stats = this.orderStats.statsFor(id);
    if (stats.orderCount > 0) {
      return err(conflict('Customers with orders cannot be deleted; anonymise them instead'));
    }
    return this.repository.delete(id) ? ok(undefined) : err(notFound('Customer', id));
  }

  private toSummary(customer: Customer): CustomerSummary {
    const stats = this.orderStats.statsFor(customer.id);
    return {
      id: customer.id,
      email: customer.email,
      fullName: customerFullName(customer),
      tier: customer.tier,
      orderCount: stats.orderCount,
      lifetimeValueMinor: stats.lifetimeValueMinor,
    };
  }
}
