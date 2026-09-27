import type { PaginationQuery } from '@spk-bansos/shared';

import type { Paginated } from '@spk-bansos/shared';

export interface PageResult<T> {
  items: T[];
  total: number;
}

/**
 * Mengubah hasil query menjadi bentuk respons seragam. Offset dihitung di database
 * (LIMIT/OFFSET) karena skala data desa masih kecil; kalau nanti tumbuh besar,
 * cukup ganti ke keyset pagination tanpa mengubah bentuk respons.
 */
export const buildPaginated = <T>(result: PageResult<T>, query: PaginationQuery): Paginated<T> => ({
  items: result.items,
  meta: {
    page: query.page,
    limit: query.limit,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
  },
});

export const offsetFrom = (query: PaginationQuery): number => (query.page - 1) * query.limit;
