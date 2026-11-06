import { PROMOTION_STATUSES, type PromotionStatus } from '@atlas/shared';
import { created, errorResponse, fromResult, intQuery, okJson, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import type { UpdatePromotionDto } from './promotions.dto';
import type { PromotionsService } from './promotions.service';
import { validateCreatePromotion } from './promotions.validation';

const MAX_PAGE_SIZE = 100;

function isPromotionStatus(value: string): value is PromotionStatus {
  return (PROMOTION_STATUSES as readonly string[]).includes(value);
}

export function createPromotionsRouter(service: PromotionsService): Router {
  const router = new Router();

  router.get('/', (ctx: HttpContext) => {
    const status = ctx.query.get('status');
    const search = ctx.query.get('search');
    return fromResult(
      service.list({
        ...(search ? { search } : {}),
        ...(status && isPromotionStatus(status) ? { status } : {}),
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/stats', (ctx: HttpContext) => {
    void ctx;
    return okJson({ live: service.countByStatus('live'), scheduled: service.countByStatus('scheduled') });
  });

  router.get('/preview', (ctx: HttpContext) => {
    const code = ctx.query.get('code') ?? '';
    const subtotalMinor = intQuery(ctx.query, 'subtotalMinor', 0);
    const customerTier = ctx.query.get('tier') ?? 'standard';
    return okJson(service.preview(code.toUpperCase(), { subtotalMinor, customerTier }));
  });

  router.get('/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.post(
    '/',
    (ctx: HttpContext) => {
      const validation = validateCreatePromotion(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      const result = service.create(validation.value);
      return result.ok ? created(result.value) : errorResponse(result.error);
    },
    requireRole('admin', 'ops'),
  );

  router.patch('/:id', (ctx: HttpContext) =>
    fromResult(service.update(ctx.params['id'] ?? '', ctx.body as UpdatePromotionDto)),
  );

  router.post('/:id/archive', (ctx: HttpContext) => fromResult(service.archive(ctx.params['id'] ?? '')), requireRole('admin', 'ops'));

  router.delete('/:id', (ctx: HttpContext) => fromResult(service.remove(ctx.params['id'] ?? ''), 204), requireRole('admin'));

  return router;
}
