import { OrderStatus, type Order } from '@atlas/shared';

export interface OrderFilter {
  readonly customerId?: string;
  readonly status?: OrderStatus;
  readonly from?: string;
  readonly to?: string;
}

export interface OrderEvent {
  readonly orderId: string;
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly at: string;
  readonly actor: string;
  readonly reason?: string;
}

export class OrdersRepository {
  private readonly orders = new Map<string, Order>();
  private readonly events: OrderEvent[] = [];
  private readonly sequence = new Map<number, number>();

  constructor(seed: readonly Order[] = []) {
    for (const order of seed) {
      this.orders.set(order.id, order);
      const year = new Date(order.placedAt).getUTCFullYear();
      this.sequence.set(year, Math.max(this.sequence.get(year) ?? 0, order.number));
    }
  }

  nextNumber(year: number): number {
    const next = (this.sequence.get(year) ?? 0) + 1;
    this.sequence.set(year, next);
    return next;
  }

  findById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  findAll(filter: OrderFilter = {}): Order[] {
    return [...this.orders.values()]
      .filter((order) => (filter.customerId ? order.customerId === filter.customerId : true))
      .filter((order) => (filter.status ? order.status === filter.status : true))
      .filter((order) => (filter.from ? order.placedAt >= filter.from : true))
      .filter((order) => (filter.to ? order.placedAt <= filter.to : true))
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  save(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  appendEvent(event: OrderEvent): void {
    this.events.push(event);
  }

  eventsFor(orderId: string): OrderEvent[] {
    return this.events.filter((event) => event.orderId === orderId);
  }

  statsForCustomer(customerId: string): { orderCount: number; lifetimeValueMinor: number } {
    let orderCount = 0;
    let lifetimeValueMinor = 0;
    for (const order of this.orders.values()) {
      if (order.customerId !== customerId || order.status === OrderStatus.Cancelled) continue;
      orderCount += 1;
      lifetimeValueMinor += order.totals.grandTotalMinor;
    }
    return { orderCount, lifetimeValueMinor };
  }
}

export function seedOrders(): Order[] {
  return [
    {
      id: 'ord_01hv3kf1aa',
      number: 1041,
      customerId: 'cus_01hv3k9f2x',
      status: OrderStatus.Shipped,
      currency: 'EUR',
      lines: [
        {
          id: 'lin_01hv3kf1ab',
          productId: 'prd_01hv3kcp1a',
          sku: 'TEE-ATLAS-M',
          name: 'Atlas logo tee',
          quantity: 2,
          unitPrice: { amountMinor: 2500, currency: 'EUR' },
          discountMinor: 250,
        },
      ],
      totals: { subtotalMinor: 5000, discountMinor: 250, shippingMinor: 590, taxMinor: 1068, grandTotalMinor: 6408 },
      shippingAddress: { line1: '12 rue de la Paix', postalCode: '75002', city: 'Paris', countryCode: 'FR' },
      placedAt: '2026-04-02T14:12:00.000Z',
      updatedAt: '2026-04-03T09:00:00.000Z',
    },
    {
      id: 'ord_01hv3kf2bb',
      number: 1042,
      customerId: 'cus_01hv3k9hb2',
      status: OrderStatus.Paid,
      currency: 'EUR',
      lines: [
        {
          id: 'lin_01hv3kf2bc',
          productId: 'prd_01hv3kcq8d',
          sku: 'HOOD-NAVY-M',
          name: 'Navy hoodie',
          quantity: 1,
          unitPrice: { amountMinor: 6000, currency: 'EUR' },
          discountMinor: 480,
        },
        {
          id: 'lin_01hv3kf2bd',
          productId: 'prd_01hv3kcrw5',
          sku: 'MUG-01-STD',
          name: 'Enamel mug',
          quantity: 3,
          unitPrice: { amountMinor: 1400, currency: 'EUR' },
          discountMinor: 336,
        },
      ],
      totals: { subtotalMinor: 10_200, discountMinor: 816, shippingMinor: 0, taxMinor: 1877, grandTotalMinor: 11_261 },
      shippingAddress: { line1: '4 Clerkenwell Road', postalCode: 'EC1M 5PA', city: 'London', countryCode: 'GB' },
      note: 'Gift wrap please',
      placedAt: '2026-04-20T10:05:00.000Z',
      updatedAt: '2026-04-20T10:06:00.000Z',
    },
  ];
}
