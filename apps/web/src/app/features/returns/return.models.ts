import type { Return, ReturnReason, ReturnStatus } from '@atlas/shared';

export type { ReturnReason, ReturnStatus };

export interface ReturnDto extends Return {
  readonly reference: string;
  readonly orderReference: string;
}

export interface ReturnListFilter {
  readonly status: ReturnStatus | null;
  readonly customerId: string | null;
  readonly orderId: string | null;
  readonly page: number;
  readonly pageSize: number;
}

export interface ReturnRequestLine {
  readonly orderLineId: string;
  readonly quantity: number;
  readonly reason: ReturnReason;
}

export interface ReturnRequest {
  readonly orderId: string;
  readonly lines: readonly ReturnRequestLine[];
  readonly note?: string;
}

export interface ReturnDecision {
  readonly decision: 'approve' | 'reject';
  readonly note?: string;
}
