/**
 * @file Checkout helpers: the checkout cookie and the order reference.
 *
 * Between the Shipping and Payment steps the checkout lives in a short-lived,
 * httpOnly cookie rather than on the server: nothing exists to attach it to
 * until the order is created. The cookie carries three things:
 *
 * - the shipping address, validated again whenever it is read back, since a
 *   cookie is client-editable;
 * - the id of the customer it belongs to, so on a shared browser the next
 *   person to sign in never sees, or ships to, someone else's address;
 * - a random checkout token, which PurchaseModel uses to place one order per
 *   checkout however many times Pay is submitted.
 */

import { randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
import { normaliseShipping, validateShipping } from './shippingValidation.js';

/** Name of the cookie carrying the checkout between steps. */
export const CHECKOUT_COOKIE = 'lpa_checkout';

/** Shape of a checkout token: 16 random bytes as hex. */
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

/** Characters an order reference's random part is drawn from. */
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** "YYYY-MM-DD" in the store's time zone: en-CA formats dates that way. */
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: config.appTimezone });

/**
 * Options for the checkout cookie: like the session cookie, but gone when the
 * browser closes, since a half-finished checkout is not worth remembering.
 *
 * @param {boolean} [isProduction] - Whether to require HTTPS.
 * @returns {{httpOnly: boolean, sameSite: 'lax', secure: boolean, path: string}} Cookie options.
 */
export function checkoutCookieOptions(isProduction = config.isProduction) {
  return { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' };
}

/**
 * Generate a checkout token.
 *
 * @returns {string} 32 hex characters.
 */
export function newCheckoutToken() {
  return randomBytes(16).toString('hex');
}

/**
 * Write a checkout as a cookie value.
 *
 * @param {{customerId: number, token: string, shipping: Record<string, string>}} checkout - Validated checkout.
 * @returns {string} JSON for the cookie.
 */
export function serialiseCheckout({ customerId, token, shipping }) {
  return JSON.stringify({ customerId, token, shipping });
}

/**
 * Read a checkout back from its cookie, for the customer signed in now.
 *
 * @param {string|undefined} raw - Raw cookie value.
 * @param {number} customerId - The signed-in customer.
 * @returns {{token: string, shipping: Record<string, string>}|null} The
 *   checkout, or null when the cookie is missing, unreadable, invalid or
 *   another customer's.
 */
export function readCheckout(raw, customerId) {
  if (typeof raw !== 'string') return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.customerId !== customerId) return null;
  if (typeof parsed.token !== 'string' || !TOKEN_PATTERN.test(parsed.token)) return null;
  if (parsed.shipping === null || typeof parsed.shipping !== 'object') return null;

  const shipping = normaliseShipping(parsed.shipping);
  return Object.keys(validateShipping(shipping)).length === 0 ? { token: parsed.token, shipping } : null;
}

/**
 * Generate a customer-facing order reference: LPA-YYYYMMDD-XXXXXX.
 *
 * The id would do for the database, but a reference that carries the date and
 * cannot be guessed from the previous order's is what a customer quotes.
 *
 * @param {Date} [now] - When the order is placed.
 * @param {(size: number) => Buffer} [random] - Source of random bytes.
 * @returns {string} The reference.
 */
export function orderReference(now = new Date(), random = randomBytes) {
  const date = dateFormatter.format(now).replaceAll('-', '');
  const suffix = [...random(6)].map((byte) => BASE36[byte % 36]).join('');
  return `LPA-${date}-${suffix}`;
}
