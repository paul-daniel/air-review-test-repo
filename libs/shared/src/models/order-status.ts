export enum OrderStatus {
  Draft = 'DRAFT',
  Pending = 'PENDING',
  Paid = 'PAID',
  Shipped = 'SHIPPED',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
}

/** Allowed forward transitions. Anything not listed here is rejected by the API. */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.Draft]: [OrderStatus.Pending, OrderStatus.Cancelled],
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (Object.values(OrderStatus) as string[]).includes(value);
}
