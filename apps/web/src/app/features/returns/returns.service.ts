import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type { ReturnDecision, ReturnDto, ReturnListFilter, ReturnRequest } from './return.models';

@Injectable({ providedIn: 'root' })
export class ReturnsService {
  private readonly api = inject(ApiClientService);

  list(filter: ReturnListFilter): Observable<Paged<ReturnDto>> {
    return this.api.get<Paged<ReturnDto>>('returns', {
      status: filter.status,
      customerId: filter.customerId,
      orderId: filter.orderId,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): Observable<ReturnDto> {
    return this.api.get<ReturnDto>(`returns/${id}`);
  }

  request(request: ReturnRequest): Observable<ReturnDto> {
    return this.api.post<ReturnDto>('returns', request);
  }

  decide(id: string, decision: ReturnDecision): Observable<ReturnDto> {
    return this.api.post<ReturnDto>(`returns/${id}/decision`, decision);
  }

  markReceived(id: string): Observable<ReturnDto> {
    return this.api.post<ReturnDto>(`returns/${id}/received`, {});
  }

  refund(id: string): Observable<ReturnDto> {
    return this.api.post<ReturnDto>(`returns/${id}/refund`, {});
  }
}
