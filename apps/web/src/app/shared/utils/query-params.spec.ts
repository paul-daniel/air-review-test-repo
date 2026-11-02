import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { readListParams, toQueryParams } from './query-params';

describe('query params', () => {
  it('reads list params with clamping and defaults', () => {
    const params = readListParams(convertToParamMap({ page: '0', pageSize: '500', search: ' tee ' }));
    expect(params).toEqual({ page: 1, pageSize: 100, search: 'tee', sort: null });
  });

  it('drops default values when serialising', () => {
    expect(toQueryParams({ page: 1, pageSize: 25, search: '', sort: null })).toEqual({
      page: null,
      pageSize: null,
      search: null,
      sort: null,
    });
    expect(toQueryParams({ page: 3, pageSize: 50, search: 'x', sort: 'name:asc' })).toEqual({
      page: 3,
      pageSize: 50,
      search: 'x',
      sort: 'name:asc',
    });
  });
});
