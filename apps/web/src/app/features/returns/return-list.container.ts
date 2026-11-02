import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { isReturnStatus, type ReturnStatus } from '@atlas/shared';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { NotificationService } from '../../core/notification.service';
import { readListParams } from '../../shared/utils/query-params';
import { ReturnListPresenter, type ReturnAction } from './return-list.presenter';
import type { ReturnDto } from './return.models';
import { ReturnsStore } from './returns.store';

@Component({
  selector: 'atl-return-list',
  standalone: true,
  imports: [ReturnListPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-return-list-presenter
      [returns]="store.items()"
      [total]="store.total()"
      [loading]="store.isLoading()"
      [busyId]="store.busy()"
      [filter]="store.filter()"
      [canDecide]="canDecide"
      [canReceive]="canReceive"
      [canRefund]="canRefund"
      (statusChange)="onStatus($event)"
      (pageChange)="onPage($event)"
      (action)="onAction($event)"
      (openOrder)="onOpenOrder($event)"
    />
  `,
})
export class ReturnListContainer {
  protected readonly store = inject(ReturnsStore);

  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canDecide = this.auth.hasRole('admin', 'support');
  protected readonly canReceive = this.auth.hasRole('admin', 'ops');
  protected readonly canRefund = this.auth.hasRole('admin');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const list = readListParams(params);
      const status = params.get('status');
      void this.store.load({
        status: status && isReturnStatus(status) ? status : null,
        customerId: params.get('customerId'),
        orderId: params.get('orderId'),
        page: list.page,
        pageSize: list.pageSize,
      });
    });
  }

  protected onStatus(status: ReturnStatus | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected async onAction(event: { readonly item: ReturnDto; readonly action: ReturnAction; readonly note?: string }): Promise<void> {
    try {
      const updated = await this.perform(event);
      this.notifications.success(
        this.translate.instant('returns.list.updated', {
          reference: updated.reference,
          status: this.translate.instant(`returns.status.${updated.status.toLowerCase()}`),
        }),
      );
    } catch {
      this.notifications.error(this.translate.instant('returns.list.updateFailed'));
    }
  }

  protected onOpenOrder(orderId: string): void {
    void this.router.navigate(['/orders', orderId]);
  }

  private perform(event: { readonly item: ReturnDto; readonly action: ReturnAction; readonly note?: string }): Promise<ReturnDto> {
    switch (event.action) {
      case 'approve':
        return this.store.decide(event.item.id, { decision: 'approve', ...(event.note ? { note: event.note } : {}) });
      case 'reject':
        return this.store.decide(event.item.id, { decision: 'reject', ...(event.note ? { note: event.note } : {}) });
      case 'receive':
        return this.store.markReceived(event.item.id);
      case 'refund':
        return this.store.refund(event.item.id);
    }
  }
}
