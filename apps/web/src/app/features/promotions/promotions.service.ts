import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type {
  PromotionDraft,
  PromotionDto,
  PromotionListFilter,
  PromotionPreviewDto,
  PromotionStatsDto,
  PromotionSummaryDto,
} from './promotion.models';

@Injectable({ providedIn: 'root' })
export class PromotionsService {
  private readonly api = inject(ApiClientService);

  list(filter: PromotionListFilter): Observable<Paged<PromotionSummaryDto>> {
    return this.api.get<Paged<PromotionSummaryDto>>('promotions', {
      status: filter.status,
      search: filter.search,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): Observable<PromotionDto> {
    return this.api.get<PromotionDto>(`promotions/${id}`);
  }

  create(draft: PromotionDraft): Observable<PromotionDto> {
    return this.api.post<PromotionDto>('promotions', draft);
  }

  update(id: string, patch: Partial<PromotionDraft> & { readonly archived?: boolean }): Observable<PromotionDto> {
    return this.api.patch<PromotionDto>(`promotions/${id}`, patch);
  }

  archive(id: string): Observable<PromotionDto> {
    return this.api.post<PromotionDto>(`promotions/${id}/archive`, {});
  }

  preview(code: string, subtotalMinor: number, tier: string): Observable<PromotionPreviewDto> {
    return this.api.get<PromotionPreviewDto>('promotions/preview', { code, subtotalMinor, tier });
  }

  stats(): Observable<PromotionStatsDto> {
    return this.api.get<PromotionStatsDto>('promotions/stats');
  }
}
