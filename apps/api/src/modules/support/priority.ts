import type { CustomerTier } from '@atlas/shared';
import type { TicketChannel, TicketPriority } from './support.dto';

export interface TicketClassificationInput {
  readonly subject: string;
  readonly body: string;
  readonly channel: TicketChannel;
  readonly customerTier?: CustomerTier;
  /** Grand total of the related order in minor units, when the ticket references one. */
  readonly orderValueMinor?: number;
}

const P1_KEYWORDS = ['fraud', 'unauthorised', 'unauthorized', 'chargeback', 'legal', 'data breach', 'gdpr'];
const P2_KEYWORDS = ['damaged', 'wrong item', 'not delivered', 'missing', 'refund', 'lost'];
const P4_KEYWORDS = ['newsletter', 'unsubscribe', 'feedback', 'suggestion', 'question'];

const HIGH_VALUE_ORDER_MINOR = 50_000;
const PRIORITY_RANK: Readonly<Record<TicketPriority, number>> = { P1: 1, P2: 2, P3: 3, P4: 4 };

/**
 * Rule-based priority: keyword match sets a baseline, then customer tier and
 * order value can bump it one level (never past P1, never below P4).
 */
export function classifyTicketPriority(input: TicketClassificationInput): TicketPriority {
  const text = `${input.subject} ${input.body}`.toLowerCase();
  let priority: TicketPriority = 'P3';

  if (containsAny(text, P1_KEYWORDS)) {
    priority = 'P1';
  } else if (containsAny(text, P2_KEYWORDS)) {
    priority = 'P2';
  } else if (containsAny(text, P4_KEYWORDS)) {
    priority = 'P4';
  }

  const highValue = (input.orderValueMinor ?? 0) >= HIGH_VALUE_ORDER_MINOR;
  const vip = input.customerTier === 'gold' || input.customerTier === 'platinum';
  if (priority !== 'P1' && (highValue || vip || input.channel === 'phone')) {
    priority = bump(priority);
  }
  return priority;
}

export function comparePriority(left: TicketPriority, right: TicketPriority): number {
  return PRIORITY_RANK[left] - PRIORITY_RANK[right];
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function bump(priority: TicketPriority): TicketPriority {
  switch (priority) {
    case 'P4':
      return 'P3';
    case 'P3':
      return 'P2';
    case 'P2':
    case 'P1':
      return 'P1';
  }
}
