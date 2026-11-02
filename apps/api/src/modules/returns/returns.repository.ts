import { ReturnStatus, type Return } from '@atlas/shared';

export interface ReturnFilter {
  readonly status?: ReturnStatus;
  readonly customerId?: string;
  readonly orderId?: string;
}

export class ReturnsRepository {
  private readonly returns = new Map<string, Return>();

  constructor(seed: readonly Return[] = []) {
    for (const item of seed) {
      this.returns.set(item.id, item);
    }
  }

  findById(id: string): Return | undefined {
    return this.returns.get(id);
  }

  findAll(filter: ReturnFilter = {}): Return[] {
    return [...this.returns.values()]
      .filter((item) => (filter.status ? item.status === filter.status : true))
      .filter((item) => (filter.customerId ? item.customerId === filter.customerId : true))
      .filter((item) => (filter.orderId ? item.orderId === filter.orderId : true))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  save(item: Return): Return {
    this.returns.set(item.id, item);
    return item;
  }

  /** Quantities per order line that are returned or still pending a decision. */
  returnedQuantities(orderId: string): Map<string, number> {
    const totals = new Map<string, number>();
    for (const item of this.returns.values()) {
      if (item.orderId !== orderId || item.status === ReturnStatus.Rejected) continue;
      for (const line of item.lines) {
        totals.set(line.orderLineId, (totals.get(line.orderLineId) ?? 0) + line.quantity);
      }
    }
    return totals;
  }
}
