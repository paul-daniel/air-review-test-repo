import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientService } from '../../core/api-client.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const api = { get: vi.fn(), patch: vi.fn(), delete: vi.fn() };

  beforeEach(() => {
    api.get.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ApiClientService, useValue: api }] });
  });

  it('forwards list filters as query params', () => {
    api.get.mockReturnValue(of({ items: [], page: 2, pageSize: 25, total: 0 }));
    const service = TestBed.inject(CustomersService);
    service.list({ search: 'dur', tier: 'gold', page: 2, pageSize: 25 }).subscribe();
    expect(api.get).toHaveBeenCalledWith('customers', { search: 'dur', tier: 'gold', page: 2, pageSize: 25 });
  });

  it('builds detail urls', () => {
    api.get.mockReturnValue(of({}));
    TestBed.inject(CustomersService).get('cus_1').subscribe();
    expect(api.get).toHaveBeenCalledWith('customers/cus_1');
  });
});
