import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { isProductCategory } from '@atlas/shared';
import { Subject, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { searchTerm } from '../../shared/utils/debounce';
import { readListParams } from '../../shared/utils/query-params';
import { CatalogService } from './catalog.service';
import { ProductListPresenter } from './product-list.presenter';
import type { Product, ProductCategory, ProductListFilter } from './product.models';

@Component({
  selector: 'atl-product-list',
  standalone: true,
  imports: [ProductListPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-product-list-presenter
      [products]="products()"
      [total]="total()"
      [loading]="loading()"
      [filter]="filter()"
      [canEdit]="canEdit"
      (searchChange)="searchInput$.next($event)"
      (categoryChange)="onCategory($event)"
      (includeInactiveChange)="onIncludeInactive($event)"
      (pageChange)="onPage($event)"
      (productSelected)="onSelect($event)"
      (createRequested)="onCreate()"
    />
  `,
})
export class ProductListContainer {
  protected readonly products = signal<readonly Product[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly filter = signal<ProductListFilter>({
    search: '',
    category: null,
    includeInactive: false,
    page: 1,
    pageSize: 25,
  });
  protected readonly searchInput$ = new Subject<string>();

  private readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canEdit = this.auth.hasRole('admin', 'ops');

  constructor() {
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          const list = readListParams(params);
          const category = params.get('category');
          this.filter.set({
            search: list.search,
            category: category && isProductCategory(category) ? category : null,
            includeInactive: params.get('includeInactive') === 'true',
            page: list.page,
            pageSize: list.pageSize,
          });
          this.loading.set(true);
        }),
        switchMap(() => this.catalog.list(this.filter())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.products.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.searchInput$
      .pipe(searchTerm(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => void this.navigate({ search, page: 1 }));
  }

  protected onCategory(category: ProductCategory | null): void {
    void this.navigate({ category, page: 1 });
  }

  protected onIncludeInactive(includeInactive: boolean): void {
    void this.navigate({ includeInactive, page: 1 });
  }

  protected onPage(page: number): void {
    void this.navigate({ page });
  }

  protected onSelect(product: Product): void {
    if (this.canEdit) {
      void this.router.navigate(['/catalog', product.id]);
    }
  }

  protected onCreate(): void {
    void this.router.navigate(['/catalog/new']);
  }

  private navigate(patch: Partial<ProductListFilter>): Promise<boolean> {
    const next = { ...this.filter(), ...patch };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: next.search || null,
        category: next.category,
        includeInactive: next.includeInactive ? 'true' : null,
        page: next.page > 1 ? next.page : null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
