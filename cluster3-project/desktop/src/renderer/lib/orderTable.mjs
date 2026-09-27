/**
 * @file Filtering and ordering for the Orders table and the Dashboard.
 *
 * Sorting and paging are shared with the other tables in ./table.mjs.
 */

import { matchesQuery } from './table.mjs';

/** Every order status, in the order an order moves through them. */
export const ORDER_STATUSES = Object.freeze(['pending', 'shipped', 'delivered', 'cancelled']);

/**
 * Keep the orders matching a search text and a status.
 *
 * The search looks at the order id, the customer and the item names, so
 * "10312", "priya" and "dock" all find something.
 *
 * @param {ReadonlyArray<{id: string, customer: string, items: string[], status: string}>} orders
 *   All orders.
 * @param {{query: string, status: string}} criteria - Search text, and 'all'
 *   or one of ORDER_STATUSES.
 * @returns {Array<object>} The matching orders, in their original order.
 */
export function filterOrders(orders, { query, status }) {
  return orders.filter(
    (order) =>
      (status === 'all' || order.status === status) &&
      matchesQuery([order.id, order.customer, ...order.items], query),
  );
}

/**
 * The newest orders, newest first.
 *
 * Ties on the date fall back to the id, which grows with every order, so two
 * orders placed the same day still come out in a stable order.
 *
 * @param {ReadonlyArray<{id: string, placedOn: string}>} orders - All orders;
 *   `placedOn` is "YYYY-MM-DD".
 * @param {number} count - How many to keep.
 * @returns {Array<object>} Up to `count` orders; the input is not modified.
 */
export function recentOrders(orders, count) {
  return [...orders]
    .sort((a, b) => b.placedOn.localeCompare(a.placedOn) || b.id.localeCompare(a.id))
    .slice(0, count);
}
