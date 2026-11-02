import { createHash } from 'node:crypto';
import type { UserRole } from './auth.dto';

export interface UserRecord {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
  /** sha256(salt + password); demo-grade hashing for the in-memory store only. */
  readonly passwordHash: string;
  readonly salt: string;
  readonly active: boolean;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  revokedAt?: string;
}

export function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export class AuthRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(seed: readonly UserRecord[] = []) {
    for (const user of seed) {
      this.users.set(user.id, user);
    }
  }

  findUserByEmail(email: string): UserRecord | undefined {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return undefined;
  }

  findUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  saveSession(session: SessionRecord): SessionRecord {
    this.sessions.set(session.id, session);
    return session;
  }

  findSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  revokeSession(id: string, at: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.revokedAt) return false;
    session.revokedAt = at;
    return true;
  }

  countActiveSessions(now: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (!session.revokedAt && session.expiresAt > now) count += 1;
    }
    return count;
  }
}

/** Development seed; passwords are placeholders and only valid for the in-memory store. */
export function seedUsers(): UserRecord[] {
  const make = (
    id: string,
    email: string,
    displayName: string,
    roles: readonly UserRole[],
    password: string,
  ): UserRecord => {
    const salt = `salt-${id}`;
    return { id, email, displayName, roles, salt, passwordHash: hashPassword(password, salt), active: true };
  };
  return [
    make('usr_admin', 'admin@atlas-shop.local', 'Atlas Admin', ['admin'], 'local-dev-only'),
    make('usr_ops', 'ops@atlas-shop.local', 'Operations', ['ops'], 'local-dev-only'),
    make('usr_support', 'support@atlas-shop.local', 'Support Desk', ['support'], 'local-dev-only'),
  ];
}
