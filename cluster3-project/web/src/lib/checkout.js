/**
 * @file Checkout helpers: the shipping cookie and the order reference.
 *
 * Between the Shipping and Payment steps the address lives in a short-lived,
 * httpOnly cookie rather than on the server: nothing exists to attach it to
 * until the order is created. It is client-editable like every cookie, so it
 * is validated again whenever it is read back.
 */

import { randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
import { normaliseShipping, validateShipping } from './shippingValidation.js';

/** Name of the cookie carrying the shipping address between steps. */
export const CHECKOUT_COOKIE = 'lpa_checkout';

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
 * Write a shipping address as a cookie value.
 *
 * @param {Record<string, string>} shipping - Validated shipping values.
 * @returns {string} JSON for the cookie.
 */
export function serialiseShipping(shipping) {
  return JSON.stringify(shipping);
}

/**
 * Read a shipping address back from its cookie.
 *
 * @param {string|undefined} raw - Raw cookie value.
 * @returns {Record<string, string>|null} The address, or null when the cookie
 *   is missing, unreadable or no longer valid.
 */
export function readShipping(raw) {
  if (typeof raw !== 'string') return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const values = normaliseShipping(parsed);
  return Object.keys(validateShipping(values)).length === 0 ? values : null;
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
