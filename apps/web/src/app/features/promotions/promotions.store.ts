import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PromotionDto, PromotionListFilter, PromotionSummaryDto } from './promotion.models';
import { PromotionsService } from './promotions.service';

export const DEFAULT_PROMOTION_FILTER: PromotionListFilter = {
  status: null,
  search: '',
  page: 1,
  pageSize: 25,
};

/** Signal store for the promotions feature. */
@Injectable({ providedIn: 'root' })
export class PromotionsStore {
  private readonly promotionsService = inject(PromotionsService);

  readonly items = signal<PromotionSummaryDto[]>([]);
  readonly total = signal(0);
  private readonly selectedPromotion = signal<PromotionDto | null>(null);
  private readonly currentFilter = signal<PromotionListFilter>(DEFAULT_PROMOTION_FILTER);
  private readonly loadingList = signal(false);
  private readonly busy = signal(false);

  readonly filter = this.currentFilter.asReadonly();
  readonly selected = this.selectedPromotion.asReadonly();
  readonly isLoadingList = this.loadingList.asReadonly();
  readonly isBusy = this.busy.asReadonly();

  readonly liveCount = computed(() => this.items().filter((promotion) => promotion.status === 'live').length);

  async load(filter: Partial<PromotionListFilter> = {}): Promise<void> {
    const next = { ...this.currentFilter(), ...filter };
    this.currentFilter.set(next);
    this.loadingList.set(true);
    try {
      const page = await firstValueFrom(this.promotionsService.list(next));
      this.items.set([...page.items]);
      this.total.set(page.total);
    } finally {
      this.loadingList.set(false);
    }
  }

  async select(id: string): Promise<void> {
    if (this.selectedPromotion()?.id === id) return;
    this.selectedPromotion.set(null);
    this.selectedPromotion.set(await firstValueFrom(this.promotionsService.get(id)));
  }

  clearSelection(): void {
    this.selectedPromotion.set(null);
  }

  async archive(id: string): Promise<PromotionDto> {
    this.busy.set(true);
    try {
      const archived = await firstValueFrom(this.promotionsService.archive(id));
      this.upsert(archived);
      return archived;
    } finally {
      this.busy.set(false);
    }
  }

  upsert(promotion: PromotionDto): void {
    const list = this.items();
    const index = list.findIndex((item) => item.id === promotion.id);
    const summary: PromotionSummaryDto = {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      kind: promotion.kind,
      value: promotion.value,
      status: promotion.archived ? 'archived' : 'live',
      usageCount: promotion.usageCount,
      usageLimit: promotion.usageLimit,
      endsAt: promotion.endsAt,
    };
    if (index >= 0) {
      list[index] = summary;
    } else {
      list.unshift(summary);
    }
    this.total.set(this.total() + (index >= 0 ? 0 : 1));
    if (this.selectedPromotion()?.id === promotion.id) {
      this.selectedPromotion.set(promotion);
    }
  }
}
