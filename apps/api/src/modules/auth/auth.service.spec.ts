import { beforeEach, describe, expect, it } from 'vitest';
import { AuthRepository, seedUsers } from './auth.repository';
import { AuthService } from './auth.service';

/** Password of the in-memory seed users (see auth.repository.ts). */
const SEED_CREDENTIAL = 'local-dev-only';

describe('AuthService', () => {
  let service: AuthService;
  let now: Date;

  beforeEach(() => {
    now = new Date('2026-05-01T08:00:00.000Z');
    service = new AuthService(new AuthRepository(seedUsers()), {
      signingKey: 'unit-test-key',
      sessionTtlMinutes: 60,
      clock: () => now,
    });
  });

  it('issues a verifiable token for valid credentials', async () => {
    const login = await service.login({ email: 'ops@atlas-shop.local', password: SEED_CREDENTIAL });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(login.value.user.roles).toEqual(['ops']);
    expect(login.value.expiresAt).toBe('2026-05-01T09:00:00.000Z');
    const principal = await service.verify(login.value.token);
    expect(principal?.userId).toBe('usr_ops');
  });

  it('rejects wrong passwords and unknown users without distinguishing them', async () => {
    const wrong = await service.login({ email: 'ops@atlas-shop.local', password: `${SEED_CREDENTIAL}-wrong` });
    const unknown = await service.login({ email: 'ghost@atlas-shop.local', password: SEED_CREDENTIAL });
    expect(wrong.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    if (!wrong.ok && !unknown.ok) {
      expect(wrong.error.message).toBe(unknown.error.message);
    }
  });

  it('rejects tampered tokens', async () => {
    const login = await service.login({ email: 'admin@atlas-shop.local', password: SEED_CREDENTIAL });
    if (!login.ok) throw new Error('login failed');
    const [sessionId] = login.value.token.split('.');
    expect(await service.verify(`${sessionId}.forged`)).toBeNull();
    expect(await service.verify('garbage')).toBeNull();
  });

  it('expires and revokes sessions', async () => {
    const login = await service.login({ email: 'admin@atlas-shop.local', password: SEED_CREDENTIAL });
    if (!login.ok) throw new Error('login failed');
    now = new Date('2026-05-01T09:00:01.000Z');
    expect(await service.verify(login.value.token)).toBeNull();

    now = new Date('2026-05-01T08:30:00.000Z');
    expect(await service.verify(login.value.token)).not.toBeNull();
    await service.logout(login.value.token);
    expect(await service.verify(login.value.token)).toBeNull();
  });
});
