import {
  collect,
  isRecord,
  optionalString,
  requireArray,
  requireOneOf,
  requireString,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import {
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type CreateTicketDto,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketDto,
} from './support.dto';

function validateTags(value: unknown): FieldError[] {
  const arrayError = requireArray(value, 'tags', { maxLength: 10 });
  if (arrayError) return [arrayError];
  return (value as unknown[])
    .map((tag, index) => requireString(tag, `tags[${index}]`, { max: 30 }))
    .filter((e): e is FieldError => e !== null);
}

function normalizeTags(value: unknown[] | undefined): string[] {
  return [...new Set((value ?? []).map((tag) => (tag as string).trim().toLowerCase()))];
}

export function validateCreateTicket(body: unknown): ValidationResult & { readonly value?: CreateTicketDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireString(body['customerId'], 'customerId', { max: 40 }),
    optionalString(body['orderId'], 'orderId', 40),
    requireString(body['subject'], 'subject', { min: 3, max: 140 }),
    requireString(body['body'], 'body', { min: 10, max: 5000 }),
    requireOneOf(body['channel'], 'channel', TICKET_CHANNELS),
    ...(body['tags'] === undefined ? [] : validateTags(body['tags'])),
  ]);
  if (!result.valid) return result;
  const orderId = typeof body['orderId'] === 'string' ? body['orderId'].trim() : '';
  return {
    valid: true,
    value: {
      customerId: body['customerId'] as string,
      ...(orderId ? { orderId } : {}),
      subject: (body['subject'] as string).trim(),
      body: (body['body'] as string).trim(),
      channel: body['channel'] as CreateTicketDto['channel'],
      ...(body['tags'] !== undefined ? { tags: normalizeTags(body['tags'] as unknown[]) } : {}),
    },
  };
}

export function validateUpdateTicket(body: unknown): ValidationResult & { readonly value?: UpdateTicketDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    body['status'] === undefined ? null : requireOneOf(body['status'], 'status', TICKET_STATUSES),
    body['priority'] === undefined ? null : requireOneOf(body['priority'], 'priority', TICKET_PRIORITIES),
    body['assigneeId'] === undefined || body['assigneeId'] === null
      ? null
      : requireString(body['assigneeId'], 'assigneeId', { max: 40 }),
    ...(body['tags'] === undefined ? [] : validateTags(body['tags'])),
  ]);
  if (!result.valid) return result;
  return {
    valid: true,
    value: {
      ...(body['status'] !== undefined ? { status: body['status'] as TicketStatus } : {}),
      ...(body['priority'] !== undefined ? { priority: body['priority'] as TicketPriority } : {}),
      ...(body['assigneeId'] !== undefined ? { assigneeId: body['assigneeId'] as string | null } : {}),
      ...(body['tags'] !== undefined ? { tags: normalizeTags(body['tags'] as unknown[]) } : {}),
    },
  };
}
