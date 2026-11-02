import { addDays } from '../dates';
import { fieldError, type FieldError } from '../validation';
import { OrderStatus } from '../models/order-status';
import type { Order } from '../models/order';
import { RETURN_WINDOW_DAYS, isReturnReason } from '../models/return';

export interface RequestedReturnLine {
  readonly orderLineId: string;
  readonly quantity: number;
  readonly reason: string;
}

/** Quantities already returned (or pending return) per order line id. */
export type ReturnedQuantities = ReadonlyMap<string, number>;

export function returnDeadline(order: Pick<Order, 'updatedAt'>): Date {
  return addDays(new Date(order.updatedAt), RETURN_WINDOW_DAYS);
}

export function isWithinReturnWindow(order: Pick<Order, 'status' | 'updatedAt'>, now: Date): boolean {
  return order.status === OrderStatus.Delivered && now.getTime() <= returnDeadline(order).getTime();
}

/**
 * Domain-level validation shared by the API (authoritative) and the web form
 * (early feedback). Returns an empty list when the request is acceptable.
 */
export function validateReturnRequest(
  order: Order,
  lines: readonly RequestedReturnLine[],
  alreadyReturned: ReturnedQuantities,
  now: Date,
): FieldError[] {
  const errors: FieldError[] = [];

  if (order.status !== OrderStatus.Delivered) {
    errors.push(fieldError('orderId', 'not_delivered', 'Only delivered orders can be returned'));
  } else if (!isWithinReturnWindow(order, now)) {
    errors.push(
      fieldError('orderId', 'window_expired', `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery`),
    );
  }

  if (lines.length === 0) {
    errors.push(fieldError('lines', 'min_items', 'At least one line must be returned'));
  }

  const seen = new Set<string>();
  lines.forEach((line, index) => {
    const prefix = `lines[${index}]`;
    const orderLine = order.lines.find((candidate) => candidate.id === line.orderLineId);
    if (!orderLine) {
      errors.push(fieldError(`${prefix}.orderLineId`, 'unknown_line', `${line.orderLineId} is not a line of this order`));
      return;
    }
    if (seen.has(line.orderLineId)) {
      errors.push(fieldError(`${prefix}.orderLineId`, 'duplicate', 'Each order line can appear only once'));
      return;
    }
    seen.add(line.orderLineId);

    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      errors.push(fieldError(`${prefix}.quantity`, 'min', 'quantity must be a positive integer'));
    } else {
      const remaining = orderLine.quantity - (alreadyReturned.get(line.orderLineId) ?? 0);
      if (line.quantity > remaining) {
        errors.push(
          fieldError(`${prefix}.quantity`, 'exceeds_remaining', `Only ${remaining} unit(s) of ${orderLine.sku} can still be returned`),
        );
      }
    }

    if (!isReturnReason(line.reason)) {
      errors.push(fieldError(`${prefix}.reason`, 'enum', 'reason is not a known return reason'));
    }
  });

  return errors;
}
