import { validationError } from '../../lib/result';
import { errorResponse, fromResult, noContent, okJson, type HttpContext } from '../../lib/http';
import { Router } from '../../lib/router';
import type { AuthService } from './auth.service';
import { validateLoginRequest } from './auth.validation';

export function createAuthRouter(service: AuthService): Router {
  const router = new Router();

  router.post('/login', async (ctx: HttpContext) => {
    const validation = validateLoginRequest(ctx.body);
    if (!validation.valid || !validation.value) {
      return errorResponse(validationError(validation.valid ? [] : validation.errors));
    }
    const result = await service.login(validation.value);
    if (!result.ok) {
      ctx.logger.warn('login rejected', { email: validation.value.email });
    }
    return fromResult(result);
  });

  router.post('/logout', async (ctx: HttpContext) => {
    const header = ctx.headers['authorization'] ?? '';
    const result = await service.logout(header.replace(/^Bearer\s+/i, ''));
    return result.ok ? noContent() : errorResponse(result.error);
  });

  router.get('/me', (ctx: HttpContext) => {
    if (!ctx.principal) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const result = service.me(ctx.principal);
    return result.ok ? okJson(result.value) : errorResponse(result.error);
  });

  return router;
}
