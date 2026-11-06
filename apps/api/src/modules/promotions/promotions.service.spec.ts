import { beforeEach, describe, expect, it } from 'vitest';
import { PromotionsRepository, seedPromotions } from './promotions.repository';
import { PromotionsService } from './promotions.service';
import { validateCreatePromotion, validateUpdatePromotion } from './promotions.validation';

const NOW = '2026-07-01T10:00:00.000Z';

describe('PromotionsService', () => {
  let service: PromotionsService;

  beforeEach(() => {
    service = new PromotionsService(new PromotionsRepository(seedPromotions()), () => NOW);
  });

  it('lists promotions with a derived status, newest first', () => {
    const result = service.list({ page: 1, pageSize: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.map((p) => `${p.code}:${p.status}`)).toEqual([
      'SUMMER15:live',
      'GOLDSHIP:live',
      'WELCOME10:live',
      'OLDCODE:archived',
    ]);
    const archived = service.list({ page: 1, pageSize: 10, status: 'archived' });
    expect(archived.ok && archived.value.total).toBe(1);
  });

  it('creates a promotion from a validated dto and rejects duplicate codes', () => {
    const validation = validateCreatePromotion({
      code: ' spring 15 ',
      name: 'Spring',
      kind: 'percent',
      value: 15,
      startsAt: '2026-03-01T00:00:00.000Z',
      endsAt: '2026-03-31T23:59:59.000Z',
    });
    expect(validation.valid).toBe(true);
    if (!validation.valid || !validation.value) return;
    const created = service.create(validation.value);
    expect(created.ok && created.value.code).toBe('SPRING15');
    const duplicate = service.create(validation.value);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe('CONFLICT');
  });

  it('validates value against the kind and the date range', () => {
    const tooHigh = validateCreatePromotion({ code: 'X', name: 'x', kind: 'percent', value: 150, startsAt: NOW, endsAt: '2026-08-01T00:00:00.000Z' });
    const backwards = validateCreatePromotion({ code: 'X', name: 'x', kind: 'fixed', value: 500, startsAt: NOW, endsAt: '2026-01-01T00:00:00.000Z' });
    expect(tooHigh.valid).toBe(false);
    expect(backwards.valid).toBe(false);
    if (!backwards.valid) expect(backwards.errors.map((e) => e.field)).toContain('endsAt');
    expect(validateUpdatePromotion({ archived: 'yes' }, 'percent').valid).toBe(false);
  });

  it('previews a code against the order context', () => {
    expect(service.preview('WELCOME10', { subtotalMinor: 5000, customerTier: 'standard' })).toMatchObject({ applies: true, discountMinor: 500 });
    expect(service.preview('WELCOME10', { subtotalMinor: 2000, customerTier: 'standard' })).toMatchObject({ applies: false, reason: 'below_minimum' });
    expect(service.preview('GOLDSHIP', { subtotalMinor: 2000, customerTier: 'standard' })).toMatchObject({ applies: false, reason: 'tier_not_eligible' });
    expect(service.preview('GOLDSHIP', { subtotalMinor: 2000, customerTier: 'gold' })).toMatchObject({ applies: true, freeShipping: true });
    expect(service.preview('NOPE', { subtotalMinor: 2000, customerTier: 'gold' })).toMatchObject({ applies: false, reason: 'unknown_code' });
  });

  it('refuses to edit archived promotions and to delete used ones', () => {
    const edit = service.update('prm_01hv3kold03', { name: 'Renamed' });
    expect(edit.ok).toBe(false);
    if (!edit.ok) expect(edit.error.code).toBe('INVALID_STATE');
    const remove = service.remove('prm_01hv3kwelc0');
    expect(remove.ok).toBe(false);
    const fresh = service.remove('prm_01hv3ksumm1');
    expect(fresh.ok).toBe(true);
  });

  it('records uses and counts live promotions', () => {
    service.recordUse('SUMMER15');
    expect(service.forCode('SUMMER15')?.usageCount).toBe(1);
    expect(service.countByStatus('live')).toBe(3);
  });
});
