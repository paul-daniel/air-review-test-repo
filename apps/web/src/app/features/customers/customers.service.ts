import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type { Customer, CustomerFormValue, CustomerListFilter, CustomerSummary } from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiClientService);

  list(filter: CustomerListFilter): Observable<Paged<CustomerSummary>> {
    return this.api.get<Paged<CustomerSummary>>('customers', {
      search: filter.search,
      tier: filter.tier,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): Observable<Customer> {
    return this.api.get<Customer>(`customers/${id}`);
  }

  update(id: string, value: CustomerFormValue): Observable<Customer> {
    return this.api.patch<Customer>(`customers/${id}`, value);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`customers/${id}`);
  }
}
