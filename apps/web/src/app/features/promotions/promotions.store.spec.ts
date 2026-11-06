import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PromotionDto, PromotionSummaryDto } from './promotion.models';
import { PromotionsService } from './promotions.service';
import { PromotionsStore } from './promotions.store';

const summary = (id: string, status: PromotionSummaryDto['status']): PromotionSummaryDto => ({
  id,
  code: id.toUpperCase(),
  name: id,
  kind: 'percent',
  value: 10,
  status,
  usageCount: 0,
  usageLimit: null,
  endsAt: '2026-12-31T23:59:59.000Z',
});

const promotion = (id: string, archived = false): PromotionDto => ({
  ...summary(id, 'live'),
  minSubtotalMinor: 0,
  tiers: [],
  startsAt: '2026-01-01T00:00:00.000Z',
  archived,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('PromotionsStore', () => {
  const service = { list: vi.fn(), get: vi.fn(), archive: vi.fn() };

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.list.mockReturnValue(of({ items: [summary('spring', 'live'), summary('old', 'archived')], page: 1, pageSize: 25, total: 2 }));
    service.get.mockImplementation((id: string) => of(promotion(id)));
    service.archive.mockImplementation((id: string) => of(promotion(id, true)));
    TestBed.configureTestingModule({ providers: [{ provide: PromotionsService, useValue: service }] });
  });

  it('loads the list and counts live promotions', async () => {
    const store = TestBed.inject(PromotionsStore);
    await store.load();
    expect(store.items()).toHaveLength(2);
    expect(store.liveCount()).toBe(1);
  });

  it('archives the selected promotion and reflects it in the list', async () => {
    const store = TestBed.inject(PromotionsStore);
    await store.load();
    await store.select('spring');
    await store.archive('spring');
    expect(store.items().find((item) => item.id === 'spring')?.status).toBe('archived');
    expect(store.selected()?.archived).toBe(true);
  });
});
