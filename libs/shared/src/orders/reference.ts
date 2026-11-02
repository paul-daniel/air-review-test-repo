import type { Order } from '../models/order';

const REFERENCE_PREFIX = 'ORD';
const NUMBER_WIDTH = 6;
const REFERENCE_PATTERN = /^ORD-(\d{4})-(\d{6,})$/;

export interface OrderReferenceParts {
  readonly year: number;
  readonly number: number;
}

/**
 * Human-readable order reference, e.g. `ORD-2026-001041`: the year the order
 * was placed (UTC) and the per-year sequence number padded to six digits.
 */
export function formatOrderReference(order: Pick<Order, 'number' | 'placedAt'>): string {
  const year = new Date(order.placedAt).getUTCFullYear();
  return `${REFERENCE_PREFIX}-${year}-${String(order.number).padStart(NUMBER_WIDTH, '0')}`;
}

export function parseOrderReference(reference: string): OrderReferenceParts | null {
  const match = REFERENCE_PATTERN.exec(reference.trim().toUpperCase());
  if (!match) return null;
  return { year: Number.parseInt(match[1] ?? '', 10), number: Number.parseInt(match[2] ?? '', 10) };
}
