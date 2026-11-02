import {
  canTransition,
  createId,
  formatOrderReference,
  nowIso,
  OrderStatus,
  type Order,
  type OrderLine,
} from '@atlas/shared';
import type { PagedResponse } from '../customers/customers.dto';
import { err, invalidState, ok, notFound, type AppError, type Result } from '../../lib/result';
import type { PricingService } from '../pricing/pricing.service';
import type { CreateOrderDto, OrderListQuery, OrderResponseDto, TransitionOrderDto } from './orders.dto';
import type { OrderEvent, OrdersRepository } from './orders.repository';

export interface StockReserver {
  reserve(lines: readonly { readonly sku: string; readonly quantity: number }[]): Result<void>;
}

export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly pricing: PricingService,
    private readonly stock: StockReserver,
    private readonly clock: () => string = nowIso,
  ) {}

  list(query: OrderListQuery): Result<PagedResponse<OrderResponseDto>> {
    const all = this.repository.findAll({
      ...(query.customerId !== undefined ? { customerId: query.customerId } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.from !== undefined ? { from: query.from } : {}),
      ...(query.to !== undefined ? { to: query.to } : {}),
    });
    const start = (query.page - 1) * query.pageSize;
    return ok({
      items: all.slice(start, start + query.pageSize).map(toOrderResponse),
      page: query.page,
      pageSize: query.pageSize,
      total: all.length,
    });
  }

  getById(id: string): Result<OrderResponseDto> {
    const order = this.repository.findById(id);
    return order ? ok(toOrderResponse(order)) : err(notFound('Order', id));
  }

  history(id: string): Result<OrderEvent[]> {
    if (!this.repository.findById(id)) return err(notFound('Order', id));
    return ok(this.repository.eventsFor(id));
  }

  create(dto: CreateOrderDto, actor: string): Result<OrderResponseDto> {
    const quote = this.pricing.quote({
      customerId: dto.customerId,
      currency: dto.currency,
      shippingCountryCode: dto.shippingAddress.countryCode,
      lines: dto.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      ...(dto.promoCode ? { promoCode: dto.promoCode } : {}),
    });
    if (!quote.ok) return quote;

    const reservation = this.stock.reserve(dto.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })));
    if (!reservation.ok) return reservation;

    const now = this.clock();
    const lines: OrderLine[] = quote.value.lines.map((line, index) => ({
      id: createId('lin'),
      productId: line.productId,
      sku: dto.lines[index]?.sku ?? line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPrice: { amountMinor: line.unitPriceMinor, currency: dto.currency },
      discountMinor: line.discountMinor,
    }));
    const order: Order = {
      id: createId('ord'),
      number: this.repository.nextNumber(new Date(now).getUTCFullYear()),
      customerId: dto.customerId,
      status: OrderStatus.Pending,
      currency: dto.currency,
      lines,
      totals: quote.value.totals,
      shippingAddress: dto.shippingAddress,
      ...(dto.note ? { note: dto.note } : {}),
      placedAt: now,
      updatedAt: now,
    };
    this.repository.save(order);
    this.repository.appendEvent({ orderId: order.id, from: null, to: order.status, at: now, actor });
    return ok(toOrderResponse(order));
  }

  transition(id: string, dto: TransitionOrderDto, actor: string): Result<OrderResponseDto> {
    const order = this.repository.findById(id);
    if (!order) return err(notFound('Order', id));
    if (!canTransition(order.status, dto.status)) {
      return err(invalidState(`Cannot move order ${order.number} from ${order.status} to ${dto.status}`));
    }
    const now = this.clock();
    const updated: Order = { ...order, status: dto.status, updatedAt: now };
    this.repository.save(updated);
    this.repository.appendEvent({
      orderId: id,
      from: order.status,
      to: dto.status,
      at: now,
      actor,
      ...(dto.reason ? { reason: dto.reason } : {}),
    });
    return ok(toOrderResponse(updated));
  }

  statsForCustomer(customerId: string): { orderCount: number; lifetimeValueMinor: number } {
    return this.repository.statsForCustomer(customerId);
  }
}

export function toOrderResponse(order: Order): OrderResponseDto {
  return {
    reference: formatOrderReference(order),
    id: order.id,
    number: order.number,
    customerId: order.customerId,
    status: order.status,
    currency: order.currency,
    lines: order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPriceMinor: line.unitPrice.amountMinor,
      discountMinor: line.discountMinor,
    })),
    totals: order.totals,
    shippingAddress: order.shippingAddress,
    ...(order.note ? { note: order.note } : {}),
    placedAt: order.placedAt,
    updatedAt: order.updatedAt,
  };
}

export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}
