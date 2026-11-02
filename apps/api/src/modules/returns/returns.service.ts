import {
  calculateRefund,
  canTransitionReturn,
  createId,
  nowIso,
  ReturnStatus,
  validateReturnRequest,
  type Order,
  type Return,
  type ReturnLine,
} from '@atlas/shared';
import type { PagedResponse } from '../customers/customers.dto';
import { err, invalidState, notFound, ok, validationError, type Result } from '../../lib/result';
import type { CreateReturnDto, DecideReturnDto, ReturnListQuery, ReturnResponseDto } from './returns.dto';
import type { ReturnsRepository } from './returns.repository';

export interface ReturnsDependencies {
  readonly findOrder: (id: string) => Order | undefined;
  /** Puts received units back into stock; called once per received return. */
  readonly restock: (lines: readonly { readonly sku: string; readonly quantity: number }[]) => Result<void>;
  readonly clock?: () => string;
}

/** Reasons for which the customer is not charged a restocking fee. */
const NO_FEE_REASONS = new Set(['damaged', 'wrong_item', 'not_as_described']);
const RESTOCKING_FEE_PERCENT = 10;

export class ReturnsService {
  private readonly clock: () => string;

  constructor(
    private readonly repository: ReturnsRepository,
    private readonly deps: ReturnsDependencies,
  ) {
    this.clock = deps.clock ?? nowIso;
  }

  list(query: ReturnListQuery): Result<PagedResponse<ReturnResponseDto>> {
    const all = this.repository.findAll({
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.customerId !== undefined ? { customerId: query.customerId } : {}),
      ...(query.orderId !== undefined ? { orderId: query.orderId } : {}),
    });
    const start = (query.page - 1) * query.pageSize;
    const items = all
      .slice(start, start + query.pageSize)
      .map((item) => this.toResponse(item))
      .filter((item): item is ReturnResponseDto => item !== null);
    return ok({ items, page: query.page, pageSize: query.pageSize, total: all.length });
  }

  getById(id: string): Result<ReturnResponseDto> {
    const item = this.repository.findById(id);
    const response = item ? this.toResponse(item) : null;
    return response ? ok(response) : err(notFound('Return', id));
  }

  request(dto: CreateReturnDto, customerId?: string): Result<ReturnResponseDto> {
    const order = this.deps.findOrder(dto.orderId);
    if (!order) return err(notFound('Order', dto.orderId));
    if (customerId && order.customerId !== customerId) return err(notFound('Order', dto.orderId));

    const now = this.clock();
    const errors = validateReturnRequest(order, dto.lines, this.repository.returnedQuantities(order.id), new Date(now));
    if (errors.length > 0) return err(validationError(errors));

    const lines: ReturnLine[] = dto.lines.map((line) => {
      const orderLine = order.lines.find((candidate) => candidate.id === line.orderLineId);
      if (!orderLine) throw new Error(`validated line ${line.orderLineId} disappeared`);
      const refund = calculateRefund(
        [
          {
            orderedQuantity: orderLine.quantity,
            returnedQuantity: line.quantity,
            unitPriceMinor: orderLine.unitPrice.amountMinor,
            lineDiscountMinor: orderLine.discountMinor,
          },
        ],
        { restockingFeePercent: 0, shippingRefundMinor: 0 },
      );
      return {
        id: createId('lin'),
        orderLineId: orderLine.id,
        sku: orderLine.sku,
        name: orderLine.name,
        quantity: line.quantity,
        unitPrice: orderLine.unitPrice,
        discountMinor: refund.lines[0]?.discountShareMinor ?? 0,
        reason: line.reason,
        refundMinor: refund.lines[0]?.refundMinor ?? 0,
      };
    });

    const feePercent = lines.every((line) => NO_FEE_REASONS.has(line.reason)) ? 0 : RESTOCKING_FEE_PERCENT;
    const fullReturn = isFullReturn(order, lines, this.repository.returnedQuantities(order.id));
    const totals = calculateRefund(
      lines.map((line) => ({
        orderedQuantity: line.quantity,
        returnedQuantity: line.quantity,
        unitPriceMinor: line.unitPrice.amountMinor,
        lineDiscountMinor: line.discountMinor,
      })),
      { restockingFeePercent: feePercent, shippingRefundMinor: fullReturn ? order.totals.shippingMinor : 0 },
    );

    const item: Return = {
      id: createId('ret'),
      orderId: order.id,
      customerId: order.customerId,
      status: ReturnStatus.Requested,
      currency: order.currency,
      lines,
      restockingFeeMinor: totals.restockingFeeMinor,
      shippingRefundMinor: totals.shippingRefundMinor,
      refundTotalMinor: totals.totalMinor,
      ...(dto.note ? { note: dto.note } : {}),
      requestedAt: now,
      updatedAt: now,
    };
    this.repository.save(item);
    return this.getById(item.id);
  }

  decide(id: string, dto: DecideReturnDto): Result<ReturnResponseDto> {
    const target = dto.decision === 'approve' ? ReturnStatus.Approved : ReturnStatus.Rejected;
    return this.transition(id, target, dto.note);
  }

  markReceived(id: string): Result<ReturnResponseDto> {
    const item = this.repository.findById(id);
    if (!item) return err(notFound('Return', id));
    const restocked = this.deps.restock(item.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })));
    if (!restocked.ok) return restocked;
    return this.transition(id, ReturnStatus.Received);
  }

  refund(id: string): Result<ReturnResponseDto> {
    return this.transition(id, ReturnStatus.Refunded);
  }

  private transition(id: string, to: ReturnStatus, note?: string): Result<ReturnResponseDto> {
    const item = this.repository.findById(id);
    if (!item) return err(notFound('Return', id));
    if (!canTransitionReturn(item.status, to)) {
      return err(invalidState(`Return cannot move from ${item.status} to ${to}`));
    }
    const now = this.clock();
    const terminal = to === ReturnStatus.Rejected || to === ReturnStatus.Refunded;
    const updated: Return = {
      ...item,
      status: to,
      ...(note ? { decisionNote: note } : {}),
      updatedAt: now,
      ...(terminal ? { resolvedAt: now } : {}),
    };
    this.repository.save(updated);
    return this.getById(id);
  }

  private toResponse(item: Return): ReturnResponseDto | null {
    const order = this.deps.findOrder(item.orderId);
    if (!order) return null;
    const year = new Date(item.requestedAt).getUTCFullYear();
    const index = this.repository.findAll({ orderId: item.orderId }).findIndex((candidate) => candidate.id === item.id) + 1;
    return {
      ...item,
      reference: `RET-${year}-${String(order.number).padStart(6, '0')}-${index}`,
      orderReference: `ORD-${new Date(order.placedAt).getUTCFullYear()}-${String(order.number).padStart(6, '0')}`,
    };
  }
}

function isFullReturn(order: Order, lines: readonly ReturnLine[], previouslyReturned: ReadonlyMap<string, number>): boolean {
  return order.lines.every((orderLine) => {
    const now = lines.find((line) => line.orderLineId === orderLine.id)?.quantity ?? 0;
    return (previouslyReturned.get(orderLine.id) ?? 0) + now >= orderLine.quantity;
  });
}
