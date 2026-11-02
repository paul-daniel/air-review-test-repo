import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    // HTTP errors are surfaced by the error interceptor; avoid double toasts.
    if (error instanceof HttpErrorResponse) {
      return;
    }
    const unwrapped = unwrapRejection(error);
    console.error('[atlas] unhandled error', unwrapped);
    this.notifications.error(unwrapped instanceof Error ? unwrapped.message : 'Unexpected error');
  }
}

function unwrapRejection(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'rejection' in error) {
    return (error as { rejection: unknown }).rejection;
  }
  return error;
}
