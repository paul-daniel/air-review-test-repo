import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, map, switchMap } from 'rxjs';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { CatalogService } from './catalog.service';
import { ProductFormPresenter } from './product-form.presenter';
import type { Product, ProductFormValue, StockAdjustment } from './product.models';

@Component({
  selector: 'atl-product-form',
  standalone: true,
  imports: [ProductFormPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-product-form-presenter
      [product]="product()"
      [saving]="saving()"
      [isNew]="isNew()"
      (save)="onSave($event)"
      (adjustStock)="onAdjustStock($event)"
      (cancel)="onCancel()"
    />
  `,
})
export class ProductFormContainer {
  protected readonly product = signal<Product | null>(null);
  protected readonly saving = signal(false);
  protected readonly isNew = signal(true);

  private readonly catalog = inject(CatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        switchMap((id) => {
          this.isNew.set(id === null);
          return id ? this.catalog.get(id) : EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => this.product.set(product),
        error: () => void this.router.navigate(['/catalog']),
      });
  }

  protected onSave(value: ProductFormValue): void {
    this.saving.set(true);
    const current = this.product();
    const request$ = current
      ? this.catalog.update(current.id, {
          name: value.name,
          description: value.description,
          category: value.category,
          priceMinor: value.priceMinor,
          taxRatePercent: value.taxRatePercent,
          active: value.active,
        })
      : this.catalog.create(value);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('catalog.form.saved', { name: saved.name }));
        void this.router.navigate(['/catalog', saved.id]);
      },
      error: () => this.saving.set(false),
    });
  }

  protected onAdjustStock(adjustment: StockAdjustment): void {
    const current = this.product();
    if (!current) return;
    this.catalog
      .adjustStock(current.id, adjustment)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.product.set(updated);
        this.notifications.success(this.translate.instant('catalog.form.stockAdjusted', { sku: adjustment.sku }));
      });
  }

  protected onCancel(): void {
    void this.router.navigate(['/catalog']);
  }
}
