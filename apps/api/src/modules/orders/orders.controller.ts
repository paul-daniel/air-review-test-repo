import { isOrderStatus } from '@atlas/shared';
import { created, errorResponse, fromResult, intQuery, type HttpContext } from '../../lib/http';
import { unauthorized, validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import type { OrdersService } from './orders.service';
import { validateCreateOrder, validateDateRange, validateTransition } from './orders.validation';

export function createOrdersRouter(service: OrdersService): Router {
  const router = new Router();

  router.get('/', (ctx: HttpContext) => {
    const from = ctx.query.get('from');
    const to = ctx.query.get('to');
    const rangeErrors = validateDateRange(from, to);
    if (rangeErrors.length > 0) {
      return errorResponse(validationError(rangeErrors));
    }
    const status = ctx.query.get('status');
    const customerId = ctx.query.get('customerId');
    return fromResult(
      service.list({
        ...(customerId ? { customerId } : {}),
        ...(status && isOrderStatus(status) ? { status } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(100, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.get('/:id/history', (ctx: HttpContext) => fromResult(service.history(ctx.params['id'] ?? '')));

  router.post(
    '/',
    (ctx: HttpContext) => {
      if (!ctx.principal) return errorResponse(unauthorized());
      const validation = validateCreateOrder(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      const result = service.create(validation.value, ctx.principal.userId);
      return result.ok ? created(result.value) : errorResponse(result.error);
    },
    requireRole('admin', 'ops'),
  );

  router.post(
    '/:id/transition',
    (ctx: HttpContext) => {
      if (!ctx.principal) return errorResponse(unauthorized());
      const validation = validateTransition(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.transition(ctx.params['id'] ?? '', validation.value, ctx.principal.userId));
    },
    requireRole('admin', 'ops', 'support'),
  );

  return router;
}
