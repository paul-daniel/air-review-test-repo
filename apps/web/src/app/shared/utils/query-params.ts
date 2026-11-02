import type { ParamMap } from '@angular/router';

export interface ListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string;
  readonly sort: string | null;
}

export const DEFAULT_PAGE_SIZE = 25;

export function readListParams(params: ParamMap, defaults: Partial<ListParams> = {}): ListParams {
  return {
    page: readInt(params.get('page'), defaults.page ?? 1, 1),
    pageSize: readInt(params.get('pageSize'), defaults.pageSize ?? DEFAULT_PAGE_SIZE, 1, 100),
    search: params.get('search')?.trim() ?? defaults.search ?? '',
    sort: params.get('sort') ?? defaults.sort ?? null,
  };
}

/** Produces router query params, dropping defaults so URLs stay short. */
export function toQueryParams(params: ListParams): Record<string, string | number | null> {
  return {
    page: params.page > 1 ? params.page : null,
    pageSize: params.pageSize !== DEFAULT_PAGE_SIZE ? params.pageSize : null,
    search: params.search ? params.search : null,
    sort: params.sort,
  };
}

export function readInt(raw: string | null, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
