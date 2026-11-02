import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Principal } from '../../lib/http';
import { err, ok, unauthorized, type Result } from '../../lib/result';
import type { LoginRequestDto, LoginResponseDto, UserDto } from './auth.dto';
import { hashPassword, type AuthRepository, type UserRecord } from './auth.repository';

export interface AuthServiceOptions {
  readonly signingKey: string;
  readonly sessionTtlMinutes: number;
  readonly clock?: () => Date;
}

/**
 * Issues opaque session tokens of the form `<sessionId>.<hmac>`; the HMAC binds
 * the session id to the server key so a forged id is rejected without a lookup.
 */
export class AuthService {
  private readonly clock: () => Date;

  constructor(
    private readonly repository: AuthRepository,
    private readonly options: AuthServiceOptions,
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  async login(request: LoginRequestDto): Promise<Result<LoginResponseDto>> {
    const user = this.repository.findUserByEmail(request.email);
    if (!user || !user.active) {
      return err(unauthorized('Invalid credentials'));
    }
    if (!this.passwordMatches(user, request.password)) {
      return err(unauthorized('Invalid credentials'));
    }
    const now = this.clock();
    const expires = new Date(now.getTime() + this.options.sessionTtlMinutes * 60_000);
    const session = this.repository.saveSession({
      id: randomUUID(),
      userId: user.id,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });
    return ok({
      token: `${session.id}.${this.sign(session.id)}`,
      expiresAt: session.expiresAt,
      user: toUserDto(user),
    });
  }

  async logout(token: string): Promise<Result<void>> {
    const sessionId = this.parseToken(token);
    if (!sessionId) return err(unauthorized('Invalid token'));
    this.repository.revokeSession(sessionId, this.clock().toISOString());
    return ok(undefined);
  }

  async verify(token: string): Promise<Principal | null> {
    const sessionId = this.parseToken(token);
    if (!sessionId) return null;
    const session = this.repository.findSession(sessionId);
    if (!session || session.revokedAt) return null;
    if (session.expiresAt <= this.clock().toISOString()) return null;
    const user = this.repository.findUserById(session.userId);
    if (!user || !user.active) return null;
    return { userId: user.id, email: user.email, roles: user.roles };
  }

  me(principal: Principal): Result<UserDto> {
    const user = this.repository.findUserById(principal.userId);
    return user ? ok(toUserDto(user)) : err(unauthorized());
  }

  private passwordMatches(user: UserRecord, password: string): boolean {
    const expected = Buffer.from(user.passwordHash, 'hex');
    const actual = Buffer.from(hashPassword(password, user.salt), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private sign(sessionId: string): string {
    return createHmac('sha256', this.options.signingKey).update(sessionId).digest('base64url');
  }

  private parseToken(token: string): string | null {
    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const sessionId = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = this.sign(sessionId);
    if (signature.length !== expected.length) return null;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? sessionId : null;
  }
}

export function toUserDto(user: UserRecord): UserDto {
  return { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles };
}
