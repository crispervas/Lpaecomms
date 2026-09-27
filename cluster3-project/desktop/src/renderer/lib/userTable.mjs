/**
 * @file Filtering and avatar initials for the Users table.
 *
 * Sorting and paging are shared with the other tables in ./table.mjs.
 */

import { matchesQuery } from './table.mjs';

/** Roles the filter chips offer; 'All' means no role filter. */
export const ROLE_FILTERS = Object.freeze(['All', 'Customer', 'Admin']);

/**
 * Keep the users matching a search text and a role.
 *
 * The search is a case-insensitive substring match on name or email, so both
 * "priya" and "@lpaecomms" find someone.
 *
 * @param {ReadonlyArray<{name: string, email: string, role: string}>} users - All users.
 * @param {{query: string, role: string}} criteria - Search text and one of
 *   ROLE_FILTERS.
 * @returns {Array<object>} The matching users, in their original order.
 */
export function filterUsers(users, { query, role }) {
  return users.filter(
    (user) => (role === 'All' || user.role === role) && matchesQuery([user.name, user.email], query),
  );
}

/**
 * Two-letter initials for an avatar: first and last word of a name.
 *
 * @param {string} name - A person's full name.
 * @returns {string} Up to two uppercase letters; empty for a blank name.
 */
export function initialsOf(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
