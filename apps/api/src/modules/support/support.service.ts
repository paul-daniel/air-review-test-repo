import { createId, nowIso } from '@atlas/shared';
import type { PagedResponse } from '../customers/customers.dto';
import { err, invalidState, notFound, ok, type Result } from '../../lib/result';
import type { CreateTicketDto, TicketDto, TicketListQuery, TicketPriority, TicketStatus, UpdateTicketDto } from './support.dto';
import type { SupportRepository } from './support.repository';

const STATUS_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  open: ['pending_customer', 'resolved', 'closed'],
  pending_customer: ['open', 'resolved', 'closed'],
  resolved: ['open', 'closed'],
  closed: [],
};

const DEFAULT_PRIORITY: TicketPriority = 'P3';

export class SupportService {
  constructor(
    private readonly repository: SupportRepository,
    private readonly clock: () => string = nowIso,
  ) {}

  list(query: TicketListQuery): Result<PagedResponse<TicketDto>> {
    const all = this.repository.findAll({
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.priority !== undefined ? { priority: query.priority } : {}),
      ...(query.assigneeId !== undefined ? { assigneeId: query.assigneeId } : {}),
    });
    const start = (query.page - 1) * query.pageSize;
    return ok({
      items: all.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: all.length,
    });
  }

  getById(id: string): Result<TicketDto> {
    const ticket = this.repository.findById(id);
    return ticket ? ok(ticket) : err(notFound('Ticket', id));
  }

  create(dto: CreateTicketDto): Result<TicketDto> {
    const now = this.clock();
    const ticket: TicketDto = {
      id: createId('tkt'),
      customerId: dto.customerId,
      ...(dto.orderId ? { orderId: dto.orderId } : {}),
      subject: dto.subject,
      body: dto.body,
      channel: dto.channel,
      status: 'open',
      priority: DEFAULT_PRIORITY,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    return ok(this.repository.save(ticket));
  }

  update(id: string, dto: UpdateTicketDto): Result<TicketDto> {
    const existing = this.repository.findById(id);
    if (!existing) return err(notFound('Ticket', id));
    if (dto.status && dto.status !== existing.status && !STATUS_TRANSITIONS[existing.status].includes(dto.status)) {
      return err(invalidState(`Ticket cannot move from ${existing.status} to ${dto.status}`));
    }
    const { assigneeId: existingAssignee, ...rest } = existing;
    const assigneeId = dto.assigneeId === null ? undefined : (dto.assigneeId ?? existingAssignee);
    const updated: TicketDto = {
      ...rest,
      status: dto.status ?? existing.status,
      priority: dto.priority ?? existing.priority,
      ...(assigneeId ? { assigneeId } : {}),
      tags: dto.tags ?? existing.tags,
      updatedAt: this.clock(),
    };
    return ok(this.repository.save(updated));
  }

  backlog(): Result<Record<TicketPriority, number>> {
    return ok(this.repository.countOpenByPriority());
  }
}
