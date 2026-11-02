import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { TranslateService } from '../i18n/translate.service';
import { NotificationService } from '../notification.service';

interface ApiErrorBody {
  readonly error?: { readonly code?: string; readonly message?: string };
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const translate = inject(TranslateService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          auth.clear();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        } else if (error.status === 0) {
          notifications.error(translate.instant('common.errors.network'));
        } else if (error.status >= 500) {
          notifications.error(translate.instant('common.errors.server'));
        } else if (error.status !== 422) {
          const body = error.error as ApiErrorBody | null;
          notifications.error(body?.error?.message ?? translate.instant('common.errors.generic'));
        }
      }
      return throwError(() => error);
    }),
  );
};
