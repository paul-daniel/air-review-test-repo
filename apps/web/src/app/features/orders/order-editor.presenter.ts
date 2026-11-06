import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { OrderPromotionComponent } from './order-promotion.component';
import type { Product } from '../catalog/product.models';
import type { CustomerSummary } from '../customers/customer.models';
import type { OrderDraft, OrderDraftLine } from './order.models';

@Component({
  selector: 'atl-order-editor-presenter',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MoneyPipe, OrderPromotionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-editor.presenter.html',
  styles: `
    .lines td input { width: 64px; }
    .results { list-style: none; padding: 0; margin: 4px 0; border: 1px solid var(--atl-border); border-radius: var(--atl-radius); }
    .results li { padding: 6px 8px; cursor: pointer; }
    .results li:hover { background: var(--atl-bg); }
  `,
})
export class OrderEditorPresenter {
  readonly customers = input<readonly CustomerSummary[]>([]);
  readonly products = input<readonly Product[]>([]);
  readonly submitting = input(false);

  readonly customerSearch = output<string>();
  readonly productSearch = output<string>();
  readonly submitDraft = output<OrderDraft>();
  readonly cancel = output<void>();

  protected readonly currencies = SUPPORTED_CURRENCIES;
  protected readonly selectedCustomer = signal<CustomerSummary | null>(null);
  protected readonly lines = signal<readonly OrderDraftLine[]>([]);

  protected readonly form = new FormGroup({
    currency: new FormControl<CurrencyCode>('EUR', { nonNullable: true }),
    promoCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(32)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    shippingAddress: new FormGroup({
      line1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      countryCode: new FormControl('FR', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z]{2}$/)] }),
    }),
  });

  protected readonly subtotalMinor = computed(() =>
    this.lines().reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0),
  );
  protected readonly canSubmit = computed(
    () => this.selectedCustomer() !== null && this.lines().length > 0 && !this.submitting(),
  );

  protected onCustomerInput(event: Event): void {
    this.customerSearch.emit((event.target as HTMLInputElement).value);
  }

  protected onProductInput(event: Event): void {
    this.productSearch.emit((event.target as HTMLInputElement).value);
  }

  protected pickCustomer(customer: CustomerSummary): void {
    this.selectedCustomer.set(customer);
  }

  protected addProduct(product: Product): void {
    const variant = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    if (!variant) return;
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.sku === variant.sku);
      if (existing) {
        return lines.map((line) => (line.sku === variant.sku ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...lines,
        {
          productId: product.id,
          sku: variant.sku,
          name: `${product.name} (${variant.label})`,
          quantity: 1,
          unitPriceMinor: (variant.priceOverride ?? product.price).amountMinor,
        },
      ];
    });
  }

  protected setQuantity(sku: string, event: Event): void {
    const quantity = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (!Number.isInteger(quantity) || quantity < 1) return;
    this.lines.update((lines) => lines.map((line) => (line.sku === sku ? { ...line, quantity } : line)));
  }

  protected removeLine(sku: string): void {
    this.lines.update((lines) => lines.filter((line) => line.sku !== sku));
  }

  protected submit(): void {
    const customer = this.selectedCustomer();
    if (!customer || this.form.invalid || this.lines().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitDraft.emit({
      customerId: customer.id,
      currency: raw.currency,
      shippingAddress: raw.shippingAddress,
      lines: this.lines(),
      promoCode: raw.promoCode.trim().toUpperCase(),
      note: raw.note.trim(),
    });
  }
}
