import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from './api-client.service';

export type UserRole = 'admin' | 'ops' | 'support' | 'readonly';

export interface SessionUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
}

interface LoginResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: SessionUser;
}

const STORAGE_KEY = 'atlas.session';

interface StoredSession {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: SessionUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.session();
    return session !== null && session.expiresAt > new Date().toISOString();
  });

  hasRole(...roles: readonly UserRole[]): boolean {
    const user = this.user();
    return user !== null && roles.some((role) => user.roles.includes(role));
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(this.api.post<LoginResponse>('auth/login', { email, password }));
    const session: StoredSession = { token: response.token, expiresAt: response.expiresAt, user: response.user };
    this.session.set(session);
    writeStoredSession(session);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<void>('auth/logout', {}));
    } finally {
      this.clear();
      await this.router.navigate(['/login']);
    }
  }

  /** Called by the error interceptor when the API answers 401. */
  clear(): void {
    this.session.set(null);
    writeStoredSession(null);
  }
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      globalThis.sessionStorage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode); the in-memory signal is enough.
  }
}
