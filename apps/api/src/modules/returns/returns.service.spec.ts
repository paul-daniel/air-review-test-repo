import { OrderStatus, ReturnStatus, type Order } from '@atlas/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '../../lib/result';
import { ReturnsRepository } from './returns.repository';
import { ReturnsService } from './returns.service';

const delivered: Order = {
  id: 'ord_d',
  number: 1050,
  customerId: 'cus_1',
  status: OrderStatus.Delivered,
  currency: 'EUR',
  lines: [
    { id: 'lin_tee', productId: 'prd_tee', sku: 'TEE-ATLAS-M', name: 'Atlas logo tee', quantity: 2, unitPrice: { amountMinor: 2500, currency: 'EUR' }, discountMinor: 250 },
    { id: 'lin_mug', productId: 'prd_mug', sku: 'MUG-01-STD', name: 'Enamel mug', quantity: 1, unitPrice: { amountMinor: 1400, currency: 'EUR' }, discountMinor: 0 },
  ],
  totals: { subtotalMinor: 6400, discountMinor: 250, shippingMinor: 590, taxMinor: 1348, grandTotalMinor: 8088 },
  shippingAddress: { line1: 'x', postalCode: '75001', city: 'Paris', countryCode: 'FR' },
  placedAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-05T10:00:00.000Z',
};

describe('ReturnsService', () => {
  let service: ReturnsService;
  const restock = vi.fn();

  beforeEach(() => {
    restock.mockReset().mockReturnValue(ok(undefined));
    service = new ReturnsService(new ReturnsRepository(), {
      findOrder: (id) => (id === delivered.id ? delivered : undefined),
      restock,
      clock: () => '2026-05-20T09:00:00.000Z',
    });
  });

  it('creates a requested return with pro-rata discount and no fee for damaged goods', () => {
    const result = service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_tee', quantity: 1, reason: 'damaged' }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe(ReturnStatus.Requested);
    expect(result.value.reference).toBe('RET-2026-001050-1');
    expect(result.value.orderReference).toBe('ORD-2026-001050');
    expect(result.value.lines[0]?.discountMinor).toBe(125);
    expect(result.value.lines[0]?.refundMinor).toBe(2375);
    expect(result.value.restockingFeeMinor).toBe(0);
    expect(result.value.shippingRefundMinor).toBe(0);
    expect(result.value.refundTotalMinor).toBe(2375);
  });

  it('charges a restocking fee for change of mind and refunds shipping on a full return', () => {
    const result = service.request({
      orderId: 'ord_d',
      lines: [
        { orderLineId: 'lin_tee', quantity: 2, reason: 'changed_mind' },
        { orderLineId: 'lin_mug', quantity: 1, reason: 'other' },
      ],
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.restockingFeeMinor).toBe(615);
    expect(result.value.shippingRefundMinor).toBe(590);
    expect(result.value.refundTotalMinor).toBe(6150 - 615 + 590);
  });

  it('rejects quantities beyond what is left to return', () => {
    service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_tee', quantity: 2, reason: 'damaged' }] });
    const again = service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_tee', quantity: 1, reason: 'damaged' }] });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('VALIDATION');
  });

  it('walks the state machine and restocks on receipt', () => {
    const created = service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_mug', quantity: 1, reason: 'wrong_item' }] });
    if (!created.ok) throw new Error('setup');
    const id = created.value.id;
    expect(service.refund(id).ok).toBe(false);
    expect(service.decide(id, { decision: 'approve' }).ok).toBe(true);
    const received = service.markReceived(id);
    expect(received.ok && received.value.status).toBe(ReturnStatus.Received);
    expect(restock).toHaveBeenCalledWith([{ sku: 'MUG-01-STD', quantity: 1 }]);
    const refunded = service.refund(id);
    expect(refunded.ok && refunded.value.status).toBe(ReturnStatus.Refunded);
    expect(refunded.ok && refunded.value.resolvedAt).toBe('2026-05-20T09:00:00.000Z');
  });

  it('frees the quantities again when a return is rejected', () => {
    const first = service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_mug', quantity: 1, reason: 'other' }] });
    if (!first.ok) throw new Error('setup');
    service.decide(first.value.id, { decision: 'reject', note: 'Outside policy' });
    const second = service.request({ orderId: 'ord_d', lines: [{ orderLineId: 'lin_mug', quantity: 1, reason: 'other' }] });
    expect(second.ok).toBe(true);
  });
});
