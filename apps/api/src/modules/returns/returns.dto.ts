import type { Return, ReturnReason, ReturnStatus } from '@atlas/shared';

export interface CreateReturnLineDto {
  readonly orderLineId: string;
  readonly quantity: number;
  readonly reason: ReturnReason;
}

export interface CreateReturnDto {
  readonly orderId: string;
  readonly lines: readonly CreateReturnLineDto[];
  readonly note?: string;
}

export interface DecideReturnDto {
  readonly decision: 'approve' | 'reject';
  readonly note?: string;
}

export interface ReturnListQuery {
  readonly status?: ReturnStatus;
  readonly customerId?: string;
  readonly orderId?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface ReturnResponseDto extends Return {
  /** Human-readable reference, e.g. RET-2026-000012. */
  readonly reference: string;
  readonly orderReference: string;
}
