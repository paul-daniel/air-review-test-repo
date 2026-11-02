import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService, type UserRole } from '../auth.service';
import { NotificationService } from '../notification.service';

/** Route guard factory: `canActivate: [roleGuard('admin', 'ops')]`. */
export function roleGuard(...roles: readonly UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (auth.hasRole(...roles)) {
      return true;
    }
    inject(NotificationService).error('You do not have access to this page');
    return inject(Router).createUrlTree(['/dashboard']);
  };
}
