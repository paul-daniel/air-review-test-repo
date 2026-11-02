import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PRODUCT_CATEGORIES, totalStock } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { DataTableComponent, type TableColumn } from '../../shared/ui/data-table.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import type { Product, ProductCategory, ProductListFilter } from './product.models';

@Component({
  selector: 'atl-product-list-presenter',
  standalone: true,
  imports: [TranslatePipe, DataTableComponent, PaginationComponent],
  // Formatting pipes only (no services): they are used programmatically for table cells.
  providers: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.presenter.html',
})
export class ProductListPresenter {
  readonly products = input.required<readonly Product[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly filter = input.required<ProductListFilter>();
  readonly canEdit = input(false);

  readonly searchChange = output<string>();
  readonly categoryChange = output<ProductCategory | null>();
  readonly includeInactiveChange = output<boolean>();
  readonly pageChange = output<number>();
  readonly productSelected = output<Product>();
  readonly createRequested = output<void>();

  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly trackById = (row: Product): string => row.id;

  protected readonly columns = computed<readonly TableColumn<Product>[]>(() => [
    { key: 'sku', labelKey: 'catalog.list.columns.sku', value: (row) => row.sku },
    { key: 'name', labelKey: 'catalog.list.columns.name', value: (row) => row.name },
    { key: 'category', labelKey: 'catalog.list.columns.category', value: (row) => row.category },
    { key: 'price', labelKey: 'catalog.list.columns.price', align: 'right', value: (row) => this.money.transform(row.price) },
    { key: 'stock', labelKey: 'catalog.list.columns.stock', align: 'right', value: (row) => totalStock(row) },
    { key: 'active', labelKey: 'catalog.list.columns.status', value: (row) => (row.active ? '●' : '○') },
  ]);

  constructor(private readonly money: MoneyPipe) {}

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onCategorySelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoryChange.emit(value ? (value as ProductCategory) : null);
  }

  protected onIncludeInactiveToggle(event: Event): void {
    this.includeInactiveChange.emit((event.target as HTMLInputElement).checked);
  }
}
