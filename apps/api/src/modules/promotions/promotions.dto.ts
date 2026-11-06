import type { PromotionKind, PromotionStatus } from '@atlas/shared';

export interface CreatePromotionDto {
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  readonly value: number;
  readonly minSubtotalMinor?: number;
  readonly tiers?: readonly string[];
  readonly startsAt: string;
  readonly endsAt: string;
  readonly usageLimit?: number | null;
}

export interface UpdatePromotionDto {
  readonly name?: string;
  readonly value?: number;
  readonly minSubtotalMinor?: number;
  readonly tiers?: readonly string[];
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly usageLimit?: number | null;
  readonly archived?: boolean;
}

export interface PromotionListQuery {
  readonly status?: PromotionStatus;
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface PromotionPreviewDto {
  readonly code: string;
  readonly applies: boolean;
  readonly reason?: string;
  readonly discountMinor: number;
  readonly freeShipping: boolean;
}
