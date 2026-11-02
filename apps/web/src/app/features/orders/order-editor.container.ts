import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { formatOrderReference } from '@atlas/shared';
import { Subject, switchMap } from 'rxjs';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { CatalogService } from '../catalog/catalog.service';
import type { Product } from '../catalog/product.models';
import { CustomersService } from '../customers/customers.service';
import type { CustomerSummary } from '../customers/customer.models';
import { OrderEditorPresenter } from './order-editor.presenter';
import type { OrderDraft } from './order.models';
import { OrdersService } from './orders.service';
import { OrdersStore } from './orders.store';

@Component({
  selector: 'atl-order-editor',
  standalone: true,
  imports: [OrderEditorPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-order-editor-presenter
      [customers]="customers()"
      [products]="products()"
      [submitting]="submitting()"
      (customerSearch)="customerSearch$.next($event)"
      (productSearch)="productSearch$.next($event)"
      (submitDraft)="onSubmit($event)"
      (cancel)="onCancel()"
    />
  `,
})
export class OrderEditorContainer {
  protected readonly customers = signal<readonly CustomerSummary[]>([]);
  protected readonly products = signal<readonly Product[]>([]);
  protected readonly submitting = signal(false);
  protected readonly customerSearch$ = new Subject<string>();
  protected readonly productSearch$ = new Subject<string>();

  private readonly ordersService = inject(OrdersService);
  private readonly store = inject(OrdersStore);
  private readonly customersService = inject(CustomersService);
  private readonly catalog = inject(CatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.customerSearch$
      .pipe(
        switchMap((search) => this.customersService.list({ search, tier: null, page: 1, pageSize: 10 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.customers.set(page.items));

    this.productSearch$
      .pipe(
        switchMap((search) =>
          this.catalog.list({ search, category: null, includeInactive: false, page: 1, pageSize: 10 }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.products.set(page.items));
  }

  protected onSubmit(draft: OrderDraft): void {
    this.submitting.set(true);
    this.ordersService
      .create({
        customerId: draft.customerId,
        currency: draft.currency,
        shippingAddress: draft.shippingAddress,
        lines: draft.lines.map((line) => ({ productId: line.productId, sku: line.sku, quantity: line.quantity })),
        ...(draft.promoCode ? { promoCode: draft.promoCode } : {}),
        ...(draft.note ? { note: draft.note } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.submitting.set(false);
          this.store.upsert(order);
          this.notifications.success(
            this.translate.instant('orders.editor.created', { reference: formatOrderReference(order) }),
          );
          void this.router.navigate(['/orders', order.id]);
        },
        error: () => this.submitting.set(false),
      });
  }

  protected onCancel(): void {
    void this.router.navigate(['/orders']);
  }
}
