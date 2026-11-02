import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientService } from '../../core/api-client.service';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };

  beforeEach(() => {
    api.get.mockReset().mockReturnValue(of({ items: [], page: 1, pageSize: 25, total: 0 }));
    api.post.mockReset().mockReturnValue(of({}));
    TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: api }] });
  });

  it('only sends includeInactive when requested', () => {
    const service = TestBed.inject(CatalogService);
    service.list({ search: '', category: null, includeInactive: false, page: 1, pageSize: 25 }).subscribe();
    expect(api.get).toHaveBeenLastCalledWith('products', expect.objectContaining({ includeInactive: null }));
    service.list({ search: '', category: 'home', includeInactive: true, page: 1, pageSize: 25 }).subscribe();
    expect(api.get).toHaveBeenLastCalledWith('products', expect.objectContaining({ includeInactive: 'true', category: 'home' }));
  });

  it('posts stock adjustments to the product sub-resource', () => {
    TestBed.inject(CatalogService).adjustStock('prd_1', { sku: 'X-1', delta: -2, reason: 'damaged' }).subscribe();
    expect(api.post).toHaveBeenCalledWith('products/prd_1/stock', { sku: 'X-1', delta: -2, reason: 'damaged' });
  });
});
