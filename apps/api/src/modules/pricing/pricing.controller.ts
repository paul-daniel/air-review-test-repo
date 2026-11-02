import { errorResponse, fromResult, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import type { PricingService } from './pricing.service';
import { validateQuoteRequest } from './pricing.validation';

export function createPricingRouter(service: PricingService): Router {
  const router = new Router();

  router.post('/quote', (ctx: HttpContext) => {
    const validation = validateQuoteRequest(ctx.body);
    if (!validation.valid || !validation.value) {
      return errorResponse(validationError(validation.valid ? [] : validation.errors));
    }
    return fromResult(service.quote(validation.value));
  });

  return router;
}
