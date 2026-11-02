import { describe, expect, it } from 'vitest';
import { classifyTicketPriority, comparePriority } from './priority';

const base = { subject: 'Sizing advice', body: 'Does the hoodie run large?', channel: 'email' as const };

describe('classifyTicketPriority', () => {
  it('defaults to P3 without signals', () => {
    expect(classifyTicketPriority({ ...base, subject: 'Hello', body: 'Just checking in about my order.' })).toBe('P3');
  });

  it('uses keyword baselines', () => {
    expect(classifyTicketPriority({ ...base, body: 'I suspect a chargeback / fraud on my card.' })).toBe('P1');
    expect(classifyTicketPriority({ ...base, body: 'The parcel arrived damaged.' })).toBe('P2');
    expect(classifyTicketPriority({ ...base, subject: 'Newsletter', body: 'Please unsubscribe me.' })).toBe('P4');
  });

  it('bumps one level for VIP customers, high-value orders or phone calls', () => {
    expect(classifyTicketPriority({ ...base, customerTier: 'gold' })).toBe('P2');
    expect(classifyTicketPriority({ ...base, orderValueMinor: 50_000 })).toBe('P2');
    expect(classifyTicketPriority({ ...base, channel: 'phone', subject: 'Feedback', body: 'Just a suggestion.' })).toBe('P3');
    expect(classifyTicketPriority({ ...base, body: 'Wrong item received', customerTier: 'platinum' })).toBe('P1');
  });

  it('never bumps past P1 and only bumps once', () => {
    expect(classifyTicketPriority({ ...base, body: 'fraud', customerTier: 'platinum', orderValueMinor: 99_999, channel: 'phone' })).toBe('P1');
    expect(classifyTicketPriority({ ...base, customerTier: 'platinum', orderValueMinor: 99_999, channel: 'phone' })).toBe('P2');
  });

  it('orders priorities', () => {
    expect(comparePriority('P1', 'P3')).toBeLessThan(0);
    expect(comparePriority('P4', 'P4')).toBe(0);
  });
});
