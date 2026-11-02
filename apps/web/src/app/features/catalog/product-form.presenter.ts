import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { fromMajorUnits, PRODUCT_CATEGORIES, SUPPORTED_CURRENCIES, toMajorUnits, type CurrencyCode } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import type { Product, ProductCategory, ProductFormValue, StockAdjustment } from './product.models';

@Component({
  selector: 'atl-product-form-presenter',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.presenter.html',
})
export class ProductFormPresenter {
  readonly product = input.required<Product | null>();
  readonly saving = input(false);
  readonly isNew = input(true);

  readonly save = output<ProductFormValue>();
  readonly adjustStock = output<StockAdjustment>();
  readonly cancel = output<void>();

  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly currencies = SUPPORTED_CURRENCIES;
  protected readonly variants = computed(() => this.product()?.variants ?? []);

  protected readonly form = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z0-9]{2,8}(-[A-Z0-9]{1,8}){0,3}$/)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    category: new FormControl<ProductCategory>('apparel', { nonNullable: true }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    currency: new FormControl<CurrencyCode>('EUR', { nonNullable: true }),
    taxRatePercent: new FormControl(20, { nonNullable: true, validators: [Validators.min(0), Validators.max(100)] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  protected readonly stockForm = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    delta: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
  });

  constructor() {
    effect(() => {
      const product = this.product();
      if (!product) {
        this.form.reset();
        this.form.controls.sku.enable({ emitEvent: false });
        this.form.controls.currency.enable({ emitEvent: false });
        return;
      }
      this.form.reset({
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        price: toMajorUnits(product.price),
        currency: product.price.currency,
        taxRatePercent: product.taxRatePercent,
        active: product.active,
      });
      // SKU and currency are immutable once a product exists.
      this.form.controls.sku.disable({ emitEvent: false });
      this.form.controls.currency.disable({ emitEvent: false });
      this.stockForm.reset({ sku: product.variants[0]?.sku ?? '', delta: 0, reason: '' });
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.save.emit({
      sku: raw.sku,
      name: raw.name.trim(),
      description: raw.description.trim(),
      category: raw.category,
      priceMinor: fromMajorUnits(raw.price, raw.currency).amountMinor,
      currency: raw.currency,
      taxRatePercent: raw.taxRatePercent,
      active: raw.active,
    });
  }

  protected submitStock(): void {
    if (this.stockForm.invalid || this.stockForm.controls.delta.value === 0) {
      this.stockForm.markAllAsTouched();
      return;
    }
    const raw = this.stockForm.getRawValue();
    this.adjustStock.emit({ sku: raw.sku, delta: raw.delta, reason: raw.reason.trim() });
    this.stockForm.patchValue({ delta: 0, reason: '' });
  }
}
