import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { CustomerDetailPresenter } from './customer-detail.presenter';
import type { Customer, CustomerFormValue } from './customer.models';
import { CustomersService } from './customers.service';

@Component({
  selector: 'atl-customer-detail',
  standalone: true,
  imports: [CustomerDetailPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-customer-detail-presenter
      [customer]="customer()"
      [saving]="saving()"
      [canEdit]="canEdit"
      [canDelete]="canDelete"
      (save)="onSave($event)"
      (delete)="onDelete()"
      (viewOrders)="onViewOrders()"
    />
  `,
})
export class CustomerDetailContainer {
  protected readonly customer = signal<Customer | null>(null);
  protected readonly saving = signal(false);

  private readonly customersService = inject(CustomersService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canEdit = this.auth.hasRole('admin', 'ops');
  protected readonly canDelete = this.auth.hasRole('admin');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id !== null),
        switchMap((id) => this.customersService.get(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (customer) => this.customer.set(customer),
        error: () => void this.router.navigate(['/customers']),
      });
  }

  protected onSave(value: CustomerFormValue): void {
    const current = this.customer();
    if (!current) return;
    this.saving.set(true);
    this.customersService
      .update(current.id, value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.customer.set(updated);
          this.saving.set(false);
          this.notifications.success(this.translate.instant('customers.detail.saved'));
        },
        error: () => this.saving.set(false),
      });
  }

  protected onDelete(): void {
    const current = this.customer();
    if (!current) return;
    this.customersService
      .remove(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.notifications.success(this.translate.instant('customers.detail.deleted'));
        void this.router.navigate(['/customers']);
      });
  }

  protected onViewOrders(): void {
    const current = this.customer();
    if (!current) return;
    void this.router.navigate(['/orders'], { queryParams: { customerId: current.id } });
  }
}
