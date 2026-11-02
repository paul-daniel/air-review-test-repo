export type TicketStatus = 'open' | 'pending_customer' | 'resolved' | 'closed';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketChannel = 'email' | 'chat' | 'phone' | 'form';

export const TICKET_STATUSES: readonly TicketStatus[] = ['open', 'pending_customer', 'resolved', 'closed'];
export const TICKET_PRIORITIES: readonly TicketPriority[] = ['P1', 'P2', 'P3', 'P4'];
export const TICKET_CHANNELS: readonly TicketChannel[] = ['email', 'chat', 'phone', 'form'];

export interface TicketDto {
  readonly id: string;
  readonly customerId: string;
  readonly orderId?: string;
  readonly subject: string;
  readonly body: string;
  readonly channel: TicketChannel;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly assigneeId?: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTicketDto {
  readonly customerId: string;
  readonly orderId?: string;
  readonly subject: string;
  readonly body: string;
  readonly channel: TicketChannel;
  readonly tags?: readonly string[];
}

export interface UpdateTicketDto {
  readonly status?: TicketStatus;
  readonly priority?: TicketPriority;
  readonly assigneeId?: string | null;
  readonly tags?: readonly string[];
}

export interface TicketListQuery {
  readonly status?: TicketStatus;
  readonly priority?: TicketPriority;
  readonly assigneeId?: string;
  readonly page: number;
  readonly pageSize: number;
}
