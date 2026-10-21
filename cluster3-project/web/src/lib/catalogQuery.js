/**
 * @file Catalog query parsing.
 *
 * Reduces the catalog page's query string — `q`, `page` and `category` — to
 * values the controller can use without further checks. Every input is
 * public and may be repeated or malformed, so anything unreadable falls back
 * to the unfiltered first page rather than an error.
 */

import { MAX_PAGE } from './pagination.js';

/** Longest search text kept; anything beyond is cut, not refused. */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Parse the catalog page's query string.
 *
 * @param {Record<string, unknown>} query - `req.query`.
 * @returns {{q: string, page: number, category: string|null}} Trimmed search
 *   text (empty for none), a page from 1 to MAX_PAGE, and the category slug.
 */
export function parseCatalogQuery(query = {}) {
  // Express turns a repeated parameter into an array; only a plain string can
  // be a search, a page or a slug.
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, MAX_SEARCH_LENGTH) : '';
  const page = typeof query.page === 'string' && /^\d+$/.test(query.page) && Number(query.page) >= 1
    ? Math.min(Number(query.page), MAX_PAGE)
    : 1;
  const category = typeof query.category === 'string' ? query.category : null;
  return { q, page, category };
}
