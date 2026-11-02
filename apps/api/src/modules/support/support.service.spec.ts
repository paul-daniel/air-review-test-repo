import { beforeEach, describe, expect, it } from 'vitest';
import { SupportRepository, seedTickets } from './support.repository';
import { SupportService } from './support.service';
import { validateCreateTicket } from './support.validation';

describe('SupportService', () => {
  let service: SupportService;

  beforeEach(() => {
    service = new SupportService(new SupportRepository(seedTickets()), () => '2026-05-04T09:00:00.000Z');
  });

  it('creates open tickets with the default priority', () => {
    const result = service.create({
      customerId: 'cus_01hv3k9f2x',
      subject: 'Wrong size received',
      body: 'I ordered an M and received an L, what should I do?',
      channel: 'chat',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('open');
    expect(result.value.priority).toBe('P3');
    expect(result.value.tags).toEqual([]);
  });

  it('normalises tags during validation', () => {
    const validation = validateCreateTicket({
      customerId: 'cus_x',
      subject: 'Tags',
      body: 'Body long enough to pass validation.',
      channel: 'email',
      tags: [' Shipping', 'shipping', 'VIP '],
    });
    expect(validation.valid && validation.value?.tags).toEqual(['shipping', 'vip']);
  });

  it('sorts the queue by priority then age', () => {
    service.create({
      customerId: 'cus_x',
      subject: 'Urgent-ish',
      body: 'Something that will be bumped manually.',
      channel: 'phone',
    });
    const created = service.list({ page: 1, pageSize: 10 });
    const newId = created.ok ? created.value.items.find((t) => t.subject === 'Urgent-ish')?.id : undefined;
    if (!newId) throw new Error('ticket missing');
    service.update(newId, { priority: 'P1' });
    const queue = service.list({ page: 1, pageSize: 10 });
    expect(queue.ok && queue.value.items[0]?.id).toBe(newId);
  });

  it('refuses invalid status transitions', () => {
    const closed = service.update('tkt_01hv3kg2bb', { status: 'closed' });
    expect(closed.ok).toBe(true);
    const reopen = service.update('tkt_01hv3kg2bb', { status: 'open' });
    expect(reopen.ok).toBe(false);
    if (!reopen.ok) expect(reopen.error.code).toBe('INVALID_STATE');
  });

  it('reports the open backlog per priority', () => {
    const backlog = service.backlog();
    expect(backlog.ok && backlog.value).toEqual({ P1: 0, P2: 0, P3: 1, P4: 0 });
  });
});
