import type { Money } from './money';

export enum ReturnStatus {
  Requested = 'REQUESTED',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Received = 'RECEIVED',
  Refunded = 'REFUNDED',
}

export type ReturnReason = 'damaged' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'other';

export const RETURN_REASONS: readonly ReturnReason[] = [
  'damaged',
  'wrong_item',
  'not_as_described',
  'changed_mind',
  'other',
];

/** Days after delivery during which a return can be requested. */
export const RETURN_WINDOW_DAYS = 30;

export const RETURN_STATUS_TRANSITIONS: Readonly<Record<ReturnStatus, readonly ReturnStatus[]>> = {
  [ReturnStatus.Requested]: [ReturnStatus.Approved, ReturnStatus.Rejected],
  [ReturnStatus.Approved]: [ReturnStatus.Received, ReturnStatus.Rejected],
  [ReturnStatus.Received]: [ReturnStatus.Refunded],
  [ReturnStatus.Rejected]: [],
  [ReturnStatus.Refunded]: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_STATUS_TRANSITIONS[from].includes(to);
}

export function isReturnStatus(value: unknown): value is ReturnStatus {
  return typeof value === 'string' && (Object.values(ReturnStatus) as string[]).includes(value);
}

export function isReturnReason(value: unknown): value is ReturnReason {
  return typeof value === 'string' && (RETURN_REASONS as readonly string[]).includes(value);
}

export interface ReturnLine {
  readonly id: string;
  readonly orderLineId: string;
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  /** Unit price copied from the order line at request time. */
  readonly unitPrice: Money;
  /** Share of the original line discount attributable to the returned quantity. */
  readonly discountMinor: number;
  readonly reason: ReturnReason;
  /** Refund for this line in minor units, net of the discount share. */
  readonly refundMinor: number;
}

export interface Return {
  readonly id: string;
  readonly orderId: string;
  readonly customerId: string;
  readonly status: ReturnStatus;
  readonly currency: Money['currency'];
  readonly lines: readonly ReturnLine[];
  readonly restockingFeeMinor: number;
  readonly shippingRefundMinor: number;
  /** Sum of line refunds + shipping refund − restocking fee. */
  readonly refundTotalMinor: number;
  readonly note?: string;
  readonly decisionNote?: string;
  readonly requestedAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
}
