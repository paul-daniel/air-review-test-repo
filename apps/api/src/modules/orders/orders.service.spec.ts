import { OrderStatus } from '@atlas/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogRepository, seedProducts } from '../catalog/catalog.repository';
import { CatalogService } from '../catalog/catalog.service';
import { CustomersRepository, seedCustomers } from '../customers/customers.repository';
import { PricingRulesRepository } from '../pricing/pricing.repository';
import { PricingService } from '../pricing/pricing.service';
import { OrdersRepository, seedOrders } from './orders.repository';
import { OrdersService, toOrderResponse } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let catalog: CatalogService;

  beforeEach(() => {
    const clock = () => '2026-05-03T12:00:00.000Z';
    const customers = new CustomersRepository(seedCustomers());
    const products = new CatalogRepository(seedProducts());
    catalog = new CatalogService(products, clock);
    const pricing = new PricingService(new PricingRulesRepository(), {
      findCustomer: (id) => customers.findById(id),
      findProduct: (id) => products.findById(id),
      freeShippingThresholdMinor: 7500,
      standardShippingMinor: 590,
      clock,
    });
    service = new OrdersService(new OrdersRepository(seedOrders()), pricing, catalog, clock);
  });

  it('formats the order reference from the year and sequence number', () => {
    const response = service.getById('ord_01hv3kf1aa');
    expect(response.ok && response.value.reference).toBe('ORD-2026-001041');
  });

  it('creates a pending order, reserves stock and assigns the next number', () => {
    const result = service.create(
      {
        customerId: 'cus_01hv3k9f2x',
        currency: 'EUR',
        shippingAddress: { line1: '12 rue de la Paix', postalCode: '75002', city: 'Paris', countryCode: 'FR' },
        lines: [{ productId: 'prd_01hv3kcp1a', sku: 'TEE-ATLAS-M', quantity: 2 }],
      },
      'usr_ops',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.number).toBe(1043);
    expect(result.value.reference).toBe('ORD-2026-001043');
    expect(result.value.status).toBe(OrderStatus.Pending);
    expect(result.value.totals.discountMinor).toBe(250);
    const tee = catalog.getById('prd_01hv3kcp1a');
    expect(tee.ok && tee.value.variants.find((v) => v.sku === 'TEE-ATLAS-M')?.stock).toBe(28);
  });

  it('does not reserve stock when pricing fails', () => {
    const result = service.create(
      {
        customerId: 'cus_01hv3k9f2x',
        currency: 'USD',
        shippingAddress: { line1: 'x', postalCode: '10001', city: 'NYC', countryCode: 'US' },
        lines: [{ productId: 'prd_01hv3kcp1a', sku: 'TEE-ATLAS-M', quantity: 1 }],
      },
      'usr_ops',
    );
    expect(result.ok).toBe(false);
    const tee = catalog.getById('prd_01hv3kcp1a');
    expect(tee.ok && tee.value.variants.find((v) => v.sku === 'TEE-ATLAS-M')?.stock).toBe(30);
  });

  it('enforces the status state machine and records history', () => {
    const forbidden = service.transition('ord_01hv3kf1aa', { status: OrderStatus.Paid }, 'usr_ops');
    expect(forbidden.ok).toBe(false);
    const delivered = service.transition('ord_01hv3kf1aa', { status: OrderStatus.Delivered }, 'usr_ops');
    expect(delivered.ok && delivered.value.status).toBe(OrderStatus.Delivered);
    const history = service.history('ord_01hv3kf1aa');
    expect(history.ok && history.value.map((e) => e.to)).toEqual([OrderStatus.Delivered]);
  });

  it('aggregates customer stats excluding cancelled orders', () => {
    service.transition('ord_01hv3kf2bb', { status: OrderStatus.Cancelled, reason: 'test' }, 'usr_ops');
    expect(service.statsForCustomer('cus_01hv3k9hb2')).toEqual({ orderCount: 0, lifetimeValueMinor: 0 });
    expect(service.statsForCustomer('cus_01hv3k9f2x')).toEqual({ orderCount: 1, lifetimeValueMinor: 6408 });
  });

  it('maps orders to the response shape', () => {
    const [order] = seedOrders();
    if (!order) throw new Error('seed missing');
    const response = toOrderResponse(order);
    expect(response.lines[0]?.unitPriceMinor).toBe(2500);
    expect(response.note).toBeUndefined();
  });
});
