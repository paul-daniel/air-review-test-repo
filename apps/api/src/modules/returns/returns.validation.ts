import {
  collect,
  isRecord,
  optionalString,
  requireArray,
  requireInteger,
  requireOneOf,
  requireString,
  RETURN_REASONS,
  type FieldError,
  type ValidationResult,
} from '@atlas/shared';
import type { CreateReturnDto, CreateReturnLineDto, DecideReturnDto } from './returns.dto';

function validateLines(value: unknown): FieldError[] {
  const arrayError = requireArray(value, 'lines', { minLength: 1, maxLength: 200 });
  if (arrayError) return [arrayError];
  return (value as unknown[]).flatMap((line, index) => {
    const prefix = `lines[${index}]`;
    if (!isRecord(line)) {
      return [{ field: prefix, code: 'type', message: `${prefix} must be an object` }];
    }
    return [
      requireString(line['orderLineId'], `${prefix}.orderLineId`, { max: 40 }),
      requireInteger(line['quantity'], `${prefix}.quantity`, { min: 1, max: 10_000 }),
      requireOneOf(line['reason'], `${prefix}.reason`, RETURN_REASONS),
    ].filter((e): e is FieldError => e !== null);
  });
}

/** Shape validation only; business rules (window, quantities) live in @atlas/shared. */
export function validateCreateReturn(body: unknown): ValidationResult & { readonly value?: CreateReturnDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireString(body['orderId'], 'orderId', { max: 40 }),
    optionalString(body['note'], 'note', 1000),
    ...validateLines(body['lines']),
  ]);
  if (!result.valid) return result;
  const lines: CreateReturnLineDto[] = (body['lines'] as Record<string, unknown>[]).map((line) => ({
    orderLineId: line['orderLineId'] as string,
    quantity: line['quantity'] as number,
    reason: line['reason'] as CreateReturnLineDto['reason'],
  }));
  const note = typeof body['note'] === 'string' ? body['note'].trim() : '';
  return { valid: true, value: { orderId: body['orderId'] as string, lines, ...(note ? { note } : {}) } };
}

export function validateDecideReturn(body: unknown): ValidationResult & { readonly value?: DecideReturnDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireOneOf(body['decision'], 'decision', ['approve', 'reject'] as const),
    optionalString(body['note'], 'note', 1000),
  ]);
  if (!result.valid) return result;
  const note = typeof body['note'] === 'string' ? body['note'].trim() : '';
  if (body['decision'] === 'reject' && !note) {
    return { valid: false, errors: [{ field: 'note', code: 'required', message: 'A note is required when rejecting' }] };
  }
  return { valid: true, value: { decision: body['decision'] as DecideReturnDto['decision'], ...(note ? { note } : {}) } };
}
