/**
 * @file Pagination for list endpoints.
 *
 * Parses `page`, `limit`, `sort`, `order` and `search` from a query string and
 * builds the `pagination` block of the response envelope. Page numbers start at
 * 1 because that is what clients show to people.
 */

import { z } from 'zod';

/** Largest page a client may ask for; protects the database from `limit=1e6`. */
export const MAX_LIMIT = 100;

/**
 * @typedef {Object} Pagination
 * @property {number} total - Rows matching the filter.
 * @property {number} page - Page returned (1-based).
 * @property {number} limit - Page size applied.
 * @property {number} totalPages - Pages available; 0 for an empty result.
 * @property {number} count - Rows on this page.
 * @property {boolean} hasNextPage - Whether `page + 1` holds rows.
 * @property {boolean} hasPrevPage - Whether `page > 1`.
 */

/**
 * Build the query schema for a list endpoint.
 *
 * @param {Array<string>} sortable - Fields a client may sort by, besides `id`,
 *   which is always allowed and is the default.
 * @returns {import('zod').ZodObject} Schema whose output is
 *   `{ page, limit, sort, order, search? }`.
 */
export function paginationQuerySchema(sortable) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    // Clamped rather than rejected: asking for too much is not an error worth
    // failing the request over, and the pagination block reports what applied.
    limit: z.coerce.number().int().min(1).default(10).transform((n) => Math.min(n, MAX_LIMIT)),
    sort: z.enum(['id', ...sortable.filter((field) => field !== 'id')]).default('id'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z
      .string()
      .trim()
      .transform((value) => (value ? value : undefined))
      .optional(),
  });
}

/**
 * Build the envelope's pagination block.
 *
 * @param {Object} parts - Counts for this page.
 * @param {number} parts.total - Rows matching the filter.
 * @param {number} parts.page - Page returned.
 * @param {number} parts.limit - Page size applied.
 * @param {number} parts.count - Rows on this page.
 * @returns {Pagination} The block.
 */
export function buildPagination({ total, page, limit, count }) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    count,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
