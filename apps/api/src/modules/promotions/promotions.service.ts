import {
  checkPromotion,
  createId,
  nowIso,
  promotionOutcome,
  promotionStatus,
  type Promotion,
  type PromotionStatus,
  type PromotionSummary,
} from '@atlas/shared';
import { conflict, err, invalidState, notFound, ok, type Result } from '../../lib/result';
import type { PagedResponse } from '../customers/customers.dto';
import type { CreatePromotionDto, PromotionListQuery, PromotionPreviewDto, UpdatePromotionDto } from './promotions.dto';
import type { PromotionsRepository } from './promotions.repository';

export interface PromotionLookup {
  /** Resolves a code for the pricing service; null when unknown. */
  forCode(code: string): Promotion | null;
  /** Records one use once an order is placed with the code. */
  recordUse(code: string): void;
}

export class PromotionsService implements PromotionLookup {
  constructor(
    private readonly repository: PromotionsRepository,
    private readonly clock: () => string = nowIso,
  ) {}

  list(query: PromotionListQuery): Result<PagedResponse<PromotionSummary>> {
    const now = this.clock();
    const all = this.repository
      .findAll(query.search)
      .map((promotion) => this.toSummary(promotion, now))
      .filter((summary) => (query.status ? summary.status === query.status : true));
    const start = (query.page - 1) * query.pageSize;
    return ok({ items: all.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, total: all.length });
  }

  getById(id: string): Result<Promotion> {
    const promotion = this.repository.findById(id);
    return promotion ? ok(promotion) : err(notFound('Promotion', id));
  }

  create(dto: CreatePromotionDto): Result<Promotion> {
    if (this.repository.findByCode(dto.code)) {
      return err(conflict(`A promotion with code ${dto.code} already exists`));
    }
    const now = this.clock();
    const promotion: Promotion = {
      id: createId('prm'),
      code: dto.code,
      name: dto.name,
      kind: dto.kind,
      value: dto.value,
      minSubtotalMinor: dto.minSubtotalMinor ?? 0,
      tiers: dto.tiers ?? [],
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      archived: false,
      usageLimit: dto.usageLimit ?? null,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    return ok(this.repository.save(promotion));
  }

  update(id: string, dto: UpdatePromotionDto): Result<Promotion> {
    const existing = this.repository.findById(id);
    if (!existing) return err(notFound('Promotion', id));
    if (existing.archived && dto.archived !== false) {
      return err(invalidState('Archived promotions cannot be edited; restore them first'));
    }
    const updated: Promotion = {
      ...existing,
      name: dto.name ?? existing.name,
      value: dto.value ?? existing.value,
      minSubtotalMinor: dto.minSubtotalMinor ?? existing.minSubtotalMinor,
      tiers: dto.tiers ?? existing.tiers,
      startsAt: dto.startsAt ?? existing.startsAt,
      endsAt: dto.endsAt ?? existing.endsAt,
      usageLimit: dto.usageLimit === undefined ? existing.usageLimit : dto.usageLimit,
      archived: dto.archived ?? existing.archived,
      updatedAt: this.clock(),
    };
    return ok(this.repository.save(updated));
  }

  archive(id: string): Result<Promotion> {
    return this.update(id, { archived: true });
  }

  remove(id: string): Result<void> {
    const existing = this.repository.findById(id);
    if (!existing) return err(notFound('Promotion', id));
    if (existing.usageCount > 0) {
      return err(conflict('Promotions that were used cannot be deleted; archive them instead'));
    }
    return this.repository.delete(id) ? ok(undefined) : err(notFound('Promotion', id));
  }

  preview(code: string, context: { subtotalMinor: number; customerTier: string }): PromotionPreviewDto {
    const promotion = this.repository.findByCode(code);
    if (!promotion) return { code, applies: false, reason: 'unknown_code', discountMinor: 0, freeShipping: false };
    const check = checkPromotion(promotion, { ...context, nowIso: this.clock() });
    if (!check.applies) return { code, applies: false, reason: check.reason, discountMinor: 0, freeShipping: false };
    const outcome = promotionOutcome(context.subtotalMinor, promotion);
    return { code, applies: true, discountMinor: outcome.discountMinor, freeShipping: outcome.freeShipping };
  }

  forCode(code: string): Promotion | null {
    return this.repository.findByCode(code) ?? null;
  }

  recordUse(code: string): void {
    const promotion = this.repository.findByCode(code);
    if (!promotion) return;
    this.repository.save({ ...promotion, usageCount: promotion.usageCount + 1, updatedAt: this.clock() });
  }

  countByStatus(status: PromotionStatus): number {
    const now = this.clock();
    return this.repository.findAll().filter((promotion) => promotionStatus(promotion, now) === status).length;
  }

  private toSummary(promotion: Promotion, now: string): PromotionSummary {
    return {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      kind: promotion.kind,
      value: promotion.value,
      status: promotionStatus(promotion, now),
      usageCount: promotion.usageCount,
      usageLimit: promotion.usageLimit,
      endsAt: promotion.endsAt,
    };
  }
}
