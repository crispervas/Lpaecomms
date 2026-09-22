/**
 * @file Browsing history rules.
 *
 * Keeps the short list of products a visitor has opened, which is what the home
 * page's personalisation reads. Pure logic with no Express in it: the list is
 * ordering and filtering, and both are worth testing without a request.
 *
 * The list is the visitor's behaviour, not their choice — nobody asks for it and
 * nobody maintains it. That is the distinction this feature turns on: the
 * appearance cookie holds what a visitor decided, this one holds what they did.
 */

/** Name of the cookie carrying the visitor's recently viewed products. */
export const RECENT_COOKIE = 'lpa_recent';

/**
 * How many products to remember. Enough to infer an interest from, small enough
 * that the cookie stays a few dozen bytes.
 */
export const RECENT_LIMIT = 8;

/**
 * Read a history cookie.
 *
 * Unreadable entries are dropped rather than failing the whole list: a cookie
 * that picked up a stray character should cost one recommendation, not all of
 * them.
 *
 * @param {string|undefined} raw - Raw cookie value, or undefined when unset.
 * @returns {Array<number>} Product ids, most recently viewed first.
 */
export function parseRecent(raw) {
  if (typeof raw !== 'string' || raw === '') return [];

  return raw
    .split(',')
    .map((entry) => Number(entry))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, RECENT_LIMIT);
}

/**
 * Record a product view.
 *
 * Re-viewing a product moves it to the front rather than adding a second entry:
 * the list is what a visitor is interested in, and interest does not become
 * stronger by being counted twice.
 *
 * @param {Array<number>} ids - The current history, most recent first.
 * @param {number} id - The product just viewed.
 * @returns {Array<number>} The new history, at most `RECENT_LIMIT` long.
 */
export function pushRecent(ids, id) {
  // An id that cannot name a product would only produce a lookup that fails
  // later, in a place with less context about where it came from.
  if (!Number.isInteger(id) || id < 1) return ids;

  return [id, ...ids.filter((existing) => existing !== id)].slice(0, RECENT_LIMIT);
}

/**
 * Render a history as a cookie value.
 *
 * @param {Array<number>} ids - Product ids, most recent first.
 * @returns {string} A value `parseRecent` reads back unchanged.
 */
export function serialiseRecent(ids) {
  return ids.join(',');
}
