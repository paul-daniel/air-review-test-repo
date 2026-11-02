import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogRepository, seedProducts } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { validateCreateProduct } from './catalog.validation';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService(new CatalogRepository(seedProducts()), () => '2026-05-02T00:00:00.000Z');
  });

  it('hides inactive products by default', () => {
    const visible = service.list({ includeInactive: false, page: 1, pageSize: 50 });
    const all = service.list({ includeInactive: true, page: 1, pageSize: 50 });
    expect(visible.ok && visible.value.total).toBe(3);
    expect(all.ok && all.value.total).toBe(4);
  });

  it('rejects duplicate SKUs including variant SKUs', () => {
    const result = service.create({
      sku: 'TEE-ATLAS-M',
      name: 'Dup',
      category: 'apparel',
      priceMinor: 100,
      currency: 'EUR',
      taxRatePercent: 20,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CONFLICT');
  });

  it('validates variant uniqueness in the DTO', () => {
    const validation = validateCreateProduct({
      sku: 'NEW-1',
      name: 'New',
      category: 'home',
      priceMinor: 100,
      currency: 'EUR',
      taxRatePercent: 20,
      variants: [
        { sku: 'NEW-1-A', label: 'A', stock: 1 },
        { sku: 'NEW-1-A', label: 'B', stock: 1 },
      ],
    });
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors[0]?.code).toBe('duplicate');
  });

  it('adjusts stock and refuses to go negative', () => {
    const ok = service.adjustStock('prd_01hv3kcp1a', { sku: 'TEE-ATLAS-L', delta: -4, reason: 'damaged' });
    expect(ok.ok && ok.value.variants.find((v) => v.sku === 'TEE-ATLAS-L')?.stock).toBe(0);
    const bad = service.adjustStock('prd_01hv3kcp1a', { sku: 'TEE-ATLAS-L', delta: -1, reason: 'again' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('INVALID_STATE');
  });

  it('reserves stock atomically', () => {
    const result = service.reserve([
      { sku: 'TEE-ATLAS-M', quantity: 5 },
      { sku: 'HOOD-NAVY-XL', quantity: 1 },
    ]);
    expect(result.ok).toBe(false);
    const tee = service.getById('prd_01hv3kcp1a');
    expect(tee.ok && tee.value.variants.find((v) => v.sku === 'TEE-ATLAS-M')?.stock).toBe(30);
    expect(service.reserve([{ sku: 'TEE-ATLAS-M', quantity: 5 }]).ok).toBe(true);
    const after = service.getById('prd_01hv3kcp1a');
    expect(after.ok && after.value.variants.find((v) => v.sku === 'TEE-ATLAS-M')?.stock).toBe(25);
  });
});
