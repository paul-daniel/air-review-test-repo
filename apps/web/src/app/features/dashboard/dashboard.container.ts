import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { startWith, switchMap, timer } from 'rxjs';
import { DashboardPresenter } from './dashboard.presenter';
import { KpiService, type DashboardKpis } from './kpi.service';

const REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'atl-dashboard',
  standalone: true,
  imports: [DashboardPresenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <atl-dashboard-presenter
      [kpis]="kpis()"
      [lastRefreshed]="lastRefreshed()"
      [error]="error()"
      (refresh)="refresh()"
      (openOrders)="goToOrders($event)"
      (openPromotions)="goToPromotions()"
    />
  `,
})
export class DashboardContainer {
  protected readonly kpis = signal<DashboardKpis | null>(null);
  protected readonly lastRefreshed = signal<Date | null>(null);
  protected readonly error = signal(false);

  private readonly kpiService = inject(KpiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    timer(0, REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.kpiService.load()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (kpis) => {
          this.kpis.set(kpis);
          this.lastRefreshed.set(new Date());
          this.error.set(false);
        },
        error: () => this.error.set(true),
      });
  }

  protected refresh(): void {
    this.kpiService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (kpis) => {
          this.kpis.set(kpis);
          this.lastRefreshed.set(new Date());
          this.error.set(false);
        },
        error: () => this.error.set(true),
      });
  }

  protected goToOrders(status: string | null): void {
    void this.router.navigate(['/orders'], { queryParams: status ? { status } : {} });
  }

  protected goToPromotions(): void {
    void this.router.navigate(['/promotions'], { queryParams: { status: 'live' } });
  }
}
