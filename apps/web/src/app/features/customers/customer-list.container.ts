import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { isCustomerTier } from '@atlas/shared';
import { switchMap, tap } from 'rxjs';
import { NotificationService } from '../../core/notification.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { readListParams } from '../../shared/utils/query-params';
import { CustomerListPresenter } from './customer-list.presenter';
import type { CustomerListFilter, CustomerSummary, CustomerTier } from './customer.models';
import { CustomersService } from './customers.service';

/**
 * Container: owns route state, data loading and navigation. Delegates all
 * rendering to {@link CustomerListPresenter}.
 */
@Component({
  selector: 'atl-customer-list',
  standalone: true,
  imports: [CustomerListPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-customer-list-presenter
      [customers]="customers()"
      [total]="total()"
      [loading]="loading()"
      [filter]="filter()"
      (searchChange)="onSearch($event)"
      (tierChange)="onTier($event)"
      (pageChange)="onPage($event)"
      (customerSelected)="onSelect($event)"
    />
  `,
})
export class CustomerListContainer {
  protected readonly customers = signal<readonly CustomerSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly filter = signal<CustomerListFilter>({ search: '', tier: null, page: 1, pageSize: 25 });

  private readonly customersService = inject(CustomersService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          const list = readListParams(params);
          const tier = params.get('tier');
          this.filter.set({
            search: list.search,
            tier: tier && isCustomerTier(tier) ? tier : null,
            page: list.page,
            pageSize: list.pageSize,
          });
          this.loading.set(true);
        }),
        switchMap(() => this.customersService.list(this.filter())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.customers.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notifications.error(this.translate.instant('customers.list.loadError'));
        },
      });
  }

  protected onSearch(search: string): void {
    void this.navigate({ search, page: 1 });
  }

  protected onTier(tier: CustomerTier | null): void {
    void this.navigate({ tier, page: 1 });
  }

  protected onPage(page: number): void {
    void this.navigate({ page });
  }

  protected onSelect(customer: CustomerSummary): void {
    void this.router.navigate(['/customers', customer.id]);
  }

  private navigate(patch: Partial<CustomerListFilter>): Promise<boolean> {
    const next = { ...this.filter(), ...patch };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: next.search || null,
        tier: next.tier,
        page: next.page > 1 ? next.page : null,
        pageSize: next.pageSize !== 25 ? next.pageSize : null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
