/**
 * @file Sorting and paging shared by the admin tables.
 *
 * Pure functions over plain records, so `node --test` can exercise them
 * without React. When list endpoints exist, both steps move to the server as
 * query parameters and this module shrinks to what the API leaves out.
 */

/** Rows per page. */
export const PAGE_SIZE = 8;

/**
 * Order rows by one text field.
 *
 * @param {ReadonlyArray<Record<string, string>>} rows - Rows to order. The key
 *   must hold text that sorts correctly as text: names, "YYYY-MM-DD" dates, or
 *   fixed-width ids such as "#LPA-10312".
 * @param {{key: string|null, direction: 'asc'|'desc'}} sort - The field and
 *   direction; a null key keeps the original order.
 * @returns {Array<object>} A new, ordered array; the input is not modified.
 */
export function sortRows(rows, { key, direction }) {
  if (key === null) return [...rows];
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * a[key].localeCompare(b[key], 'en'));
}

/**
 * Cut one page out of a list.
 *
 * A page past the end is clamped to the last page, so deleting the only row
 * of the last page lands on the page before rather than on an empty one.
 *
 * @param {ReadonlyArray<T>} items - The full, already filtered and sorted list.
 * @param {number} page - Requested page, 1-based.
 * @param {number} [pageSize=PAGE_SIZE] - Rows per page.
 * @returns {{items: T[], page: number, pageCount: number, from: number,
 *   to: number, total: number}} The page's rows, the page actually shown, how
 *   many pages exist (at least 1), and the 1-based range shown (0–0 when empty).
 * @template T
 */
export function paginate(items, page, pageSize = PAGE_SIZE) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: current,
    pageCount,
    from: slice.length === 0 ? 0 : start + 1,
    to: start + slice.length,
    total,
  };
}

/**
 * Whether any of a row's fields contains a search text.
 *
 * @param {string[]} fields - The row's searchable text.
 * @param {string} query - What the user typed; case and outer spaces ignored.
 * @returns {boolean} True for a blank query or any match.
 */
export function matchesQuery(fields, query) {
  const needle = query.trim().toLowerCase();
  return needle === '' || fields.some((field) => field.toLowerCase().includes(needle));
}
