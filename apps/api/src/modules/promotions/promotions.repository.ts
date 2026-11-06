import type { Promotion } from '@atlas/shared';

export class PromotionsRepository {
  private readonly promotions = new Map<string, Promotion>();

  constructor(seed: readonly Promotion[] = []) {
    for (const promotion of seed) {
      this.promotions.set(promotion.id, promotion);
    }
  }

  findById(id: string): Promotion | undefined {
    return this.promotions.get(id);
  }

  findByCode(code: string): Promotion | undefined {
    for (const promotion of this.promotions.values()) {
      if (promotion.code === code) return promotion;
    }
    return undefined;
  }

  findAll(search?: string): Promotion[] {
    const needle = search?.trim().toLowerCase();
    return [...this.promotions.values()]
      .filter((promotion) => (needle ? promotion.code.toLowerCase().includes(needle) || promotion.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt) || a.code.localeCompare(b.code));
  }

  save(promotion: Promotion): Promotion {
    this.promotions.set(promotion.id, promotion);
    return promotion;
  }

  delete(id: string): boolean {
    return this.promotions.delete(id);
  }
}

export function seedPromotions(): Promotion[] {
  const at = '2026-01-10T09:00:00.000Z';
  return [
    {
      id: 'prm_01hv3kwelc0',
      code: 'WELCOME10',
      name: 'Welcome offer',
      kind: 'percent',
      value: 10,
      minSubtotalMinor: 3000,
      tiers: [],
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2027-12-31T23:59:59.000Z',
      archived: false,
      usageLimit: null,
      usageCount: 412,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prm_01hv3ksumm1',
      code: 'SUMMER15',
      name: 'Summer sale',
      kind: 'percent',
      value: 15,
      minSubtotalMinor: 10_000,
      tiers: [],
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-08-31T23:59:59.000Z',
      archived: false,
      usageLimit: 500,
      usageCount: 0,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prm_01hv3kgold2',
      code: 'GOLDSHIP',
      name: 'Free shipping for gold and platinum',
      kind: 'free_shipping',
      value: 0,
      minSubtotalMinor: 0,
      tiers: ['gold', 'platinum'],
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      archived: false,
      usageLimit: null,
      usageCount: 37,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prm_01hv3kold03',
      code: 'OLDCODE',
      name: 'Retired campaign',
      kind: 'fixed',
      value: 2000,
      minSubtotalMinor: 0,
      tiers: [],
      startsAt: '2025-01-01T00:00:00.000Z',
      endsAt: '2025-01-31T23:59:59.000Z',
      archived: true,
      usageLimit: null,
      usageCount: 88,
      createdAt: at,
      updatedAt: at,
    },
  ];
}
