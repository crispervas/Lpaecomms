/**
 * @file Cart rules.
 *
 * The web cart lives in a cookie as product ids and quantities — nothing else.
 * Names and prices are read from the catalogue on every render, never from the
 * cookie, because the cookie is client-editable and a price stored there would
 * be a price the visitor chose. Pure logic with no Express in it, like
 * lib/recentlyViewed.js, so every rule is testable without a request.
 *
 * The limits mirror the mobile cart (mobile/src/lib/cart.ts): at most 99 of
 * one product.
 */

/** Name of the cookie carrying the visitor's cart. */
export const CART_COOKIE = 'lpa_cart';

/** Most units of one product a cart line may hold. */
export const MAX_QUANTITY = 99;

/**
 * Most distinct products a cart may hold. Keeps the cookie well under the 4 KB
 * browsers allow, and bounds the catalogue lookups one cart render makes.
 */
export const MAX_LINES = 20;

/**
 * @typedef {Object} CartLine
 * @property {number} id - Product id from the catalogue.
 * @property {number} quantity - Units, 1 to MAX_QUANTITY.
 */

/**
 * Keep a quantity within the allowed range.
 *
 * @param {unknown} quantity - Anything a form or cookie may carry.
 * @returns {number} A whole number from 1 to MAX_QUANTITY; 1 when unreadable.
 */
export function clampQuantity(quantity) {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(value)));
}

/**
 * Parse a product id from a path or form value.
 *
 * @param {unknown} raw - The raw value.
 * @returns {number|null} A positive integer id, or null when it cannot name a product.
 */
export function parseProductId(raw) {
  // Number('') is 0 and Number(' 7 ') is 7; only a plain run of digits is an id.
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  if (!/^\d+$/.test(String(raw))) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Read a cart cookie written by `serialiseCart`: "12:1,7:3".
 *
 * Unreadable entries are dropped rather than failing the whole cart — a cookie
 * that picked up a stray character should cost one line, not the cart. A
 * repeated id is merged, because the cookie is client-editable and nothing
 * else validates it before it gets here.
 *
 * @param {string|undefined} raw - Raw cookie value, or undefined when unset.
 * @returns {CartLine[]} The lines, in the order they were added.
 */
export function parseCart(raw) {
  if (typeof raw !== 'string' || raw === '') return [];

  return raw.split(',').reduce((lines, entry) => {
    const [idPart, quantityPart] = entry.split(':');
    const id = parseProductId(idPart);
    if (id === null || !/^\d+$/.test(quantityPart ?? '')) return lines;
    return addToCart(lines, id, Number(quantityPart));
  }, []);
}

/**
 * Render a cart as a cookie value.
 *
 * @param {CartLine[]} lines - Cart lines.
 * @returns {string} A value `parseCart` reads back unchanged.
 */
export function serialiseCart(lines) {
  return lines.map(({ id, quantity }) => `${id}:${quantity}`).join(',');
}

/**
 * Add units of a product, merging with its existing line.
 *
 * A product not yet in a full cart is refused rather than pushing another line
 * out: dropping something the visitor chose, silently, is worse than saying
 * no. The caller can tell by the unchanged length.
 *
 * @param {CartLine[]} lines - Current lines.
 * @param {number} id - Product id.
 * @param {number} quantity - Units to add.
 * @returns {CartLine[]} The new lines; the input is never mutated.
 */
export function addToCart(lines, id, quantity) {
  const existing = lines.find((line) => line.id === id);
  if (existing) {
    return lines.map((line) =>
      line.id === id ? { id, quantity: clampQuantity(line.quantity + clampQuantity(quantity)) } : line,
    );
  }
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { id, quantity: clampQuantity(quantity) }];
}

/**
 * Set a line's quantity. A product not in the cart is left out, not added:
 * this answers the cart page's stepper, which only exists for lines already
 * there.
 *
 * @param {CartLine[]} lines - Current lines.
 * @param {number} id - Product id.
 * @param {number} quantity - The new quantity.
 * @returns {CartLine[]} The new lines.
 */
export function setQuantity(lines, id, quantity) {
  return lines.map((line) => (line.id === id ? { id, quantity: clampQuantity(quantity) } : line));
}

/**
 * Remove a product's line.
 *
 * @param {CartLine[]} lines - Current lines.
 * @param {number} id - Product id.
 * @returns {CartLine[]} The lines without it.
 */
export function removeFromCart(lines, id) {
  return lines.filter((line) => line.id !== id);
}

/**
 * Lower each line to what is in stock, dropping lines that are sold out.
 *
 * Lines whose stock is not in the map are kept as they are: a product that
 * could not be read is no reason to change what the visitor chose.
 *
 * @param {CartLine[]} lines - Current lines.
 * @param {Map<number, number>} stockById - Units in stock per product id.
 * @returns {{lines: CartLine[], changed: boolean}} The capped lines, and
 *   whether any line was lowered or dropped.
 */
export function capToStock(lines, stockById) {
  let changed = false;
  const capped = [];
  for (const line of lines) {
    if (!stockById.has(line.id)) {
      capped.push(line);
      continue;
    }
    const stock = stockById.get(line.id);
    if (stock <= 0) {
      changed = true;
    } else if (line.quantity > stock) {
      changed = true;
      capped.push({ id: line.id, quantity: stock });
    } else {
      capped.push(line);
    }
  }
  return { lines: changed ? capped : lines, changed };
}

/**
 * Count the units in a cart, for the header badge.
 *
 * @param {CartLine[]} lines - Cart lines.
 * @returns {number} Units across all lines.
 */
export function cartCount(lines) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Price the lines whose products were found.
 *
 * Sums in whole cents so repeated float additions cannot drift.
 *
 * @template {{priceAud: number}} P
 * @param {Array<{product: P, quantity: number}>} priced - Lines paired with their catalogue product.
 * @returns {{items: Array<P & {quantity: number, lineTotalAud: number}>, subtotalAud: number}}
 *   One item per line with its total, and the cart's subtotal.
 */
export function priceCart(priced) {
  let subtotalCents = 0;
  const items = priced.map(({ product, quantity }) => {
    const lineCents = Math.round(product.priceAud * 100) * quantity;
    subtotalCents += lineCents;
    return { ...product, quantity, lineTotalAud: lineCents / 100 };
  });
  return { items, subtotalAud: subtotalCents / 100 };
}
