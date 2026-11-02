import { isCustomerTier } from '@atlas/shared';
import { created, errorResponse, fromResult, intQuery, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import type { CustomersService } from './customers.service';
import { validateCreateCustomer, validateUpdateCustomer } from './customers.validation';

const MAX_PAGE_SIZE = 100;

export function createCustomersRouter(service: CustomersService): Router {
  const router = new Router();

  router.get('/', (ctx: HttpContext) => {
    const tier = ctx.query.get('tier');
    const search = ctx.query.get('search');
    return fromResult(
      service.list({
        ...(search ? { search } : {}),
        ...(tier && isCustomerTier(tier) ? { tier } : {}),
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.post(
    '/',
    (ctx: HttpContext) => {
      const validation = validateCreateCustomer(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      const result = service.create(validation.value);
      return result.ok ? created(result.value) : errorResponse(result.error);
    },
    requireRole('admin', 'ops'),
  );

  router.patch(
    '/:id',
    (ctx: HttpContext) => {
      const validation = validateUpdateCustomer(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.update(ctx.params['id'] ?? '', validation.value));
    },
    requireRole('admin', 'ops'),
  );

  router.delete(
    '/:id',
    (ctx: HttpContext) => fromResult(service.remove(ctx.params['id'] ?? ''), 204),
    requireRole('admin'),
  );

  return router;
}
