import { errorResponse, type Middleware, type Principal } from '../lib/http';
import { forbidden, unauthorized } from '../lib/result';

export interface TokenVerifier {
  verify(token: string): Promise<Principal | null>;
}

const PUBLIC_PATHS = new Set(['/health', '/api/auth/login']);

/** Resolves the bearer token into `ctx.principal`; rejects when missing or invalid. */
export function createAuthMiddleware(verifier: TokenVerifier): Middleware {
  return async (ctx, next) => {
    if (PUBLIC_PATHS.has(ctx.path)) {
      return next();
    }
    const header = ctx.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return errorResponse(unauthorized('Missing bearer token'));
    }
    const principal = await verifier.verify(header.slice('Bearer '.length).trim());
    if (!principal) {
      return errorResponse(unauthorized('Invalid or expired token'));
    }
    ctx.principal = principal;
    return next();
  };
}

/** Per-route guard: requires at least one of the listed roles. */
export function requireRole(...roles: readonly string[]): Middleware {
  return async (ctx, next) => {
    const principal = ctx.principal;
    if (!principal) {
      return errorResponse(unauthorized());
    }
    if (!roles.some((role) => principal.roles.includes(role))) {
      return errorResponse(forbidden(`Requires one of: ${roles.join(', ')}`));
    }
    return next();
  };
}
