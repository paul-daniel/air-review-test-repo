import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { PROMOTION_STATUSES, type PromotionStatus } from '@atlas/shared';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { searchTerm } from '../../shared/utils/debounce';
import { readListParams } from '../../shared/utils/query-params';
import { PromotionListPresenter } from './promotion-list.presenter';
import type { PromotionSummaryDto } from './promotion.models';
import { PromotionsStore } from './promotions.store';

function isPromotionStatus(value: string): value is PromotionStatus {
  return (PROMOTION_STATUSES as readonly string[]).includes(value);
}

@Component({
  selector: 'atl-promotion-list',
  standalone: true,
  imports: [PromotionListPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-promotion-list-presenter
      [promotions]="store.items()"
      [total]="store.total()"
      [loading]="store.isLoadingList()"
      [filter]="store.filter()"
      [canManage]="canManage"
      (searchChange)="searchInput$.next($event)"
      (statusChange)="onStatus($event)"
      (pageChange)="onPage($event)"
      (archiveRequested)="onArchive($event)"
      (createRequested)="onCreate()"
    />
  `,
})
export class PromotionListContainer {
  protected readonly store = inject(PromotionsStore);
  protected readonly searchInput$ = new Subject<string>();

  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canManage = this.auth.hasRole('admin', 'ops');

  constructor() {
    this.route.queryParamMap.subscribe((params) => this.loadFromParams(params.get('status'), params.get('search'), params.get('page')));

    this.searchInput$
      .pipe(searchTerm(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => void this.navigate({ search, page: 1 }));
  }

  protected onStatus(status: PromotionStatus | null): void {
    void this.navigate({ status, page: 1 });
  }

  protected onPage(page: number): void {
    void this.navigate({ page });
  }

  protected async onArchive(promotion: PromotionSummaryDto): Promise<void> {
    await this.store.archive(promotion.id);
    this.notifications.success(this.translate.instant('promotions.list.archived', { code: promotion.code }));
  }

  protected onCreate(): void {
    void this.router.navigate(['/promotions/new']);
  }

  private loadFromParams(status: string | null, search: string | null, page: string | null): void {
    const list = readListParams(this.route.snapshot.queryParamMap);
    void this.store.load({
      status: status && isPromotionStatus(status) ? status : null,
      search: search ?? list.search,
      page: page ? Number(page) : list.page,
      pageSize: list.pageSize,
    });
  }

  private navigate(patch: { search?: string; status?: PromotionStatus | null; page?: number }): Promise<boolean> {
    const next = { ...this.store.filter(), ...patch };
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: next.search || null, status: next.status, page: next.page > 1 ? next.page : null },
      queryParamsHandling: 'merge',
    });
  }
}
