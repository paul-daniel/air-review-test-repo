import type { TicketDto, TicketPriority, TicketStatus } from './support.dto';

export interface TicketFilter {
  readonly status?: TicketStatus;
  readonly priority?: TicketPriority;
  readonly assigneeId?: string;
}

const PRIORITY_ORDER: Readonly<Record<TicketPriority, number>> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export class SupportRepository {
  private readonly tickets = new Map<string, TicketDto>();

  constructor(seed: readonly TicketDto[] = []) {
    for (const ticket of seed) {
      this.tickets.set(ticket.id, ticket);
    }
  }

  findById(id: string): TicketDto | undefined {
    return this.tickets.get(id);
  }

  findAll(filter: TicketFilter = {}): TicketDto[] {
    return [...this.tickets.values()]
      .filter((ticket) => (filter.status ? ticket.status === filter.status : true))
      .filter((ticket) => (filter.priority ? ticket.priority === filter.priority : true))
      .filter((ticket) => (filter.assigneeId ? ticket.assigneeId === filter.assigneeId : true))
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt.localeCompare(b.createdAt),
      );
  }

  save(ticket: TicketDto): TicketDto {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  countOpenByPriority(): Record<TicketPriority, number> {
    const counts: Record<TicketPriority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const ticket of this.tickets.values()) {
      if (ticket.status === 'open' || ticket.status === 'pending_customer') {
        counts[ticket.priority] += 1;
      }
    }
    return counts;
  }
}

export function seedTickets(): TicketDto[] {
  return [
    {
      id: 'tkt_01hv3kg1aa',
      customerId: 'cus_01hv3k9hb2',
      orderId: 'ord_01hv3kf2bb',
      subject: 'Where is my hoodie?',
      body: 'Order was marked paid a week ago and nothing has shipped. Can you check?',
      channel: 'email',
      status: 'open',
      priority: 'P3',
      tags: ['shipping'],
      createdAt: '2026-04-28T08:30:00.000Z',
      updatedAt: '2026-04-28T08:30:00.000Z',
    },
    {
      id: 'tkt_01hv3kg2bb',
      customerId: 'cus_01hv3k9g7q',
      subject: 'Newsletter unsubscribe',
      body: 'Please remove me from the marketing list, the unsubscribe link does not work.',
      channel: 'form',
      status: 'resolved',
      priority: 'P4',
      assigneeId: 'usr_support',
      tags: ['marketing', 'gdpr'],
      createdAt: '2026-04-15T16:00:00.000Z',
      updatedAt: '2026-04-16T09:10:00.000Z',
    },
  ];
}
