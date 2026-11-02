import { created, errorResponse, fromResult, intQuery, type HttpContext } from '../../lib/http';
import { validationError } from '../../lib/result';
import { Router } from '../../lib/router';
import { requireRole } from '../../middleware/auth.middleware';
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from './support.dto';
import type { SupportService } from './support.service';
import { validateCreateTicket, validateUpdateTicket } from './support.validation';

export function createSupportRouter(service: SupportService): Router {
  const router = new Router();

  router.get('/tickets', (ctx: HttpContext) => {
    const status = ctx.query.get('status');
    const priority = ctx.query.get('priority');
    const assigneeId = ctx.query.get('assigneeId');
    return fromResult(
      service.list({
        ...(status && (TICKET_STATUSES as readonly string[]).includes(status) ? { status: status as TicketStatus } : {}),
        ...(priority && (TICKET_PRIORITIES as readonly string[]).includes(priority)
          ? { priority: priority as TicketPriority }
          : {}),
        ...(assigneeId ? { assigneeId } : {}),
        page: Math.max(1, intQuery(ctx.query, 'page', 1)),
        pageSize: Math.min(100, Math.max(1, intQuery(ctx.query, 'pageSize', 25))),
      }),
    );
  });

  router.get('/tickets/backlog', () => fromResult(service.backlog()));

  router.get('/tickets/:id', (ctx: HttpContext) => fromResult(service.getById(ctx.params['id'] ?? '')));

  router.post('/tickets', (ctx: HttpContext) => {
    const validation = validateCreateTicket(ctx.body);
    if (!validation.valid || !validation.value) {
      return errorResponse(validationError(validation.valid ? [] : validation.errors));
    }
    const result = service.create(validation.value);
    return result.ok ? created(result.value) : errorResponse(result.error);
  });

  router.patch(
    '/tickets/:id',
    (ctx: HttpContext) => {
      const validation = validateUpdateTicket(ctx.body);
      if (!validation.valid || !validation.value) {
        return errorResponse(validationError(validation.valid ? [] : validation.errors));
      }
      return fromResult(service.update(ctx.params['id'] ?? '', validation.value));
    },
    requireRole('admin', 'support'),
  );

  return router;
}
