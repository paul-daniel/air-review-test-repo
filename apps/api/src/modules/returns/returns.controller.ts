import { isReturnStatus } from '@atlas/shared';
import { created, errorResponse, fromResult, intQuery, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import type { ReturnsService } from './returns.service';
import { validateCreateReturn, validateDecideReturn } from './returns.validation';

export function createReturnsRouter(service: ReturnsService): Router {
  const router = new Router();

  router.get('/', (ctx: HttpContext) => {
    const status = ctx.query.get('status');
    const customerId = ctx.query.get('customerId');
    const orderId = ctx.query.get('orderId');
    return fromResult(
      service.list({
        ...(status && isReturnStatus(status) ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(orderId ? { orderId } : {}),
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(100, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.post(
    '/',
    (ctx: HttpContext) => {
      const validation = validateCreateReturn(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      const result = service.request(validation.value);
      return result.ok ? created(result.value) : errorResponse(result.error);
    },
    requireRole('admin', 'ops', 'support'),
  );

  router.post(
    '/:id/decision',
    (ctx: HttpContext) => {
      const validation = validateDecideReturn(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.decide(ctx.params['id'] ?? '', validation.value));
    },
    requireRole('admin', 'support'),
  );

  router.post('/:id/received', (ctx: HttpContext) => fromResult(service.markReceived(ctx.params['id'] ?? '')), requireRole('admin', 'ops'));

  router.post('/:id/refund', (ctx: HttpContext) => fromResult(service.refund(ctx.params['id'] ?? '')), requireRole('admin'));

  return router;
}
