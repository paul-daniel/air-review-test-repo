import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { TranslatePipe } from './core/i18n/translate.pipe';
import { NotificationService, type Notification } from './core/notification.service';

@Component({
  selector: 'atl-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="atl-header">
      <a routerLink="/dashboard" class="brand">atlas-shop</a>
      <nav>
        <a routerLink="/dashboard" routerLinkActive="active">{{ 'nav.dashboard' | translate }}</a>
        <a routerLink="/orders" routerLinkActive="active">{{ 'nav.orders' | translate }}</a>
        <a routerLink="/customers" routerLinkActive="active">{{ 'nav.customers' | translate }}</a>
        <a routerLink="/catalog" routerLinkActive="active">{{ 'nav.catalog' | translate }}</a>
        <a routerLink="/promotions" routerLinkActive="active">{{ 'nav.promotions' | translate }}</a>
      </nav>
      @if (auth.user(); as user) {
        <span class="user">{{ user.displayName }}</span>
        <button type="button" class="atl-btn" (click)="auth.logout()">{{ 'nav.logout' | translate }}</button>
      }
    </header>
    <main class="atl-page">
      <router-outlet />
    </main>
    @if (toast(); as toast) {
      <div class="atl-toast" [class]="toast.level" role="status">{{ toast.message }}</div>
    }
  `,
  styles: `
    .atl-header { display: flex; gap: 24px; align-items: center; padding: 12px 24px; background: var(--atl-surface); border-bottom: 1px solid var(--atl-border); }
    .brand { font-weight: 600; text-decoration: none; color: var(--atl-text); }
    nav { display: flex; gap: 16px; flex: 1; }
    nav a { text-decoration: none; color: var(--atl-muted); }
    nav a.active { color: var(--atl-primary); }
    .atl-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 16px; border-radius: var(--atl-radius); background: var(--atl-text); color: #fff; }
    .atl-toast.error { background: var(--atl-danger); }
    .atl-toast.success { background: var(--atl-success); }
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly toast = signal<Notification | null>(null);

  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.notifications.stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notification) => {
      this.toast.set(notification);
      setTimeout(() => this.toast.update((current) => (current === notification ? null : current)), 4000);
    });
  }
}
