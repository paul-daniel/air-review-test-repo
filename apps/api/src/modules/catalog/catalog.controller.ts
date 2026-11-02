import { isProductCategory } from '@atlas/shared';
import { created, errorResponse, fromResult, intQuery, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import type { CatalogService } from './catalog.service';
import { validateCreateProduct, validateStockAdjustment, validateUpdateProduct } from './catalog.validation';

export function createCatalogRouter(service: CatalogService): Router {
  const router = new Router();

  router.get('/', (ctx: HttpContext) => {
    const category = ctx.query.get('category');
    const search = ctx.query.get('search');
    return fromResult(
      service.list({
        ...(search ? { search } : {}),
        ...(category && isProductCategory(category) ? { category } : {}),
        includeInactive: ctx.query.get('includeInactive') === 'true',
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(100, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.post(
    '/',
    (ctx: HttpContext) => {
      const validation = validateCreateProduct(ctx.body);
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
      const validation = validateUpdateProduct(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.update(ctx.params['id'] ?? '', validation.value));
    },
    requireRole('admin', 'ops'),
  );

  router.post(
    '/:id/stock',
    (ctx: HttpContext) => {
      const validation = validateStockAdjustment(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.adjustStock(ctx.params['id'] ?? '', validation.value));
    },
    requireRole('admin', 'ops'),
  );

  return router;
}
