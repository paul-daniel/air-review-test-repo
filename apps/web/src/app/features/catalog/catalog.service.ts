import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClientService, type Paged } from '../../core/api-client.service';
import type { Product, ProductFormValue, ProductListFilter, StockAdjustment } from './product.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiClientService);

  list(filter: ProductListFilter): Observable<Paged<Product>> {
    return this.api.get<Paged<Product>>('products', {
      search: filter.search,
      category: filter.category,
      includeInactive: filter.includeInactive ? 'true' : null,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): Observable<Product> {
    return this.api.get<Product>(`products/${id}`);
  }

  create(value: ProductFormValue): Observable<Product> {
    return this.api.post<Product>('products', value);
  }

  update(id: string, value: Omit<ProductFormValue, 'sku' | 'currency'>): Observable<Product> {
    return this.api.patch<Product>(`products/${id}`, value);
  }

  adjustStock(id: string, adjustment: StockAdjustment): Observable<Product> {
    return this.api.post<Product>(`products/${id}/stock`, adjustment);
  }
}
