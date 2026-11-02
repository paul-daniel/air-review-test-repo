import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientService } from './api-client.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const api = { post: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    sessionStorage.clear();
    api.post.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClientService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('starts unauthenticated', () => {
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('stores the session after login and exposes roles', async () => {
    api.post.mockReturnValue(
      of({
        token: 'abc.def',
        expiresAt: '2999-01-01T00:00:00.000Z',
        user: { id: 'usr_1', email: 'ops@atlas-shop.local', displayName: 'Ops', roles: ['ops'] },
      }),
    );
    const service = TestBed.inject(AuthService);
    await service.login('ops@atlas-shop.local', 'local-dev-only');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.hasRole('ops')).toBe(true);
    expect(service.hasRole('admin')).toBe(false);
    expect(sessionStorage.getItem('atlas.session')).toContain('abc.def');
  });

  it('clears the session on logout even when the API call fails', async () => {
    api.post.mockReturnValueOnce(
      of({ token: 't', expiresAt: '2999-01-01T00:00:00.000Z', user: { id: 'u', email: 'e', displayName: 'd', roles: [] } }),
    );
    const service = TestBed.inject(AuthService);
    await service.login('e', 'p');
    api.post.mockImplementationOnce(() => {
      throw new Error('network');
    });
    await expect(service.logout()).rejects.toThrow('network');
    expect(service.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
