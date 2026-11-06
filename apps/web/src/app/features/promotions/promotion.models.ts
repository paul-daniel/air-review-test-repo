import type { PromotionKind, PromotionStatus } from '@atlas/shared';

export interface PromotionDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  readonly value: number;
  readonly minSubtotalMinor: number;
  readonly tiers: readonly string[];
  readonly startsAt: string;
  readonly endsAt: string;
  readonly archived: boolean;
  readonly usageLimit: number | null;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PromotionSummaryDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  readonly value: number;
  readonly status: PromotionStatus;
  readonly usageCount: number;
  readonly usageLimit: number | null;
  readonly endsAt: string;
}

export interface PromotionListFilter {
  readonly status: PromotionStatus | null;
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface PromotionDraft {
  readonly code: string;
  readonly name: string;
  readonly kind: PromotionKind;
  readonly value: number;
  readonly minSubtotalMinor: number;
  readonly tiers: readonly string[];
  readonly startsAt: string;
  readonly endsAt: string;
  readonly usageLimit: number | null;
}

export interface PromotionPreviewDto {
  readonly code: string;
  readonly applies: boolean;
  readonly reason?: string;
  readonly discountMinor: number;
  readonly freeShipping: boolean;
}

export interface PromotionStatsDto {
  readonly live: number;
  readonly scheduled: number;
}
