import { Injectable } from '@angular/core';
import { Subject, type Observable } from 'rxjs';

export type NotificationLevel = 'info' | 'success' | 'error';

export interface Notification {
  readonly level: NotificationLevel;
  readonly message: string;
  readonly at: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly subject = new Subject<Notification>();

  readonly stream$: Observable<Notification> = this.subject.asObservable();

  info(message: string): void {
    this.push('info', message);
  }

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  private push(level: NotificationLevel, message: string): void {
    this.subject.next({ level, message, at: Date.now() });
  }
}
