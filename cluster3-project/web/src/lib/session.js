/**
 * @file Customer session cookie.
 *
 * A signed-in customer carries the same JWT the API issues, but in an httpOnly
 * cookie rather than an Authorization header: the browser sends it with every
 * page request and no script can read it. `sameSite: 'lax'` keeps it off
 * cross-site POSTs, which is the site's protection against forged form
 * submissions. The cookie lives exactly as long as the token inside it.
 */

import { config } from '../config/env.js';

/** Name of the cookie holding the customer's token. */
export const SESSION_COOKIE = 'lpa_session';

/** Where a sign-in lands when it was not sent anywhere in particular. */
export const DEFAULT_AFTER_LOGIN = '/account';

/** Milliseconds per unit jsonwebtoken accepts in a lifetime such as "1h". */
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/**
 * Convert a jsonwebtoken lifetime into milliseconds.
 *
 * @param {string|number} value - Seconds as a number or digits, or digits
 *   followed by s, m, h or d.
 * @returns {number} The lifetime in milliseconds.
 * @throws {Error} When the value is in neither form.
 */
export function parseDuration(value) {
  const match = /^(\d+)([smhd]?)$/.exec(String(value).trim());
  if (!match) throw new Error(`Unreadable token lifetime "${value}". Use seconds or a number with s, m, h or d.`);
  return Number(match[1]) * UNIT_MS[match[2] || 's'];
}

/**
 * Options for setting and clearing the session cookie.
 *
 * @param {boolean} [isProduction] - Whether to require HTTPS.
 * @returns {{httpOnly: boolean, sameSite: 'lax', secure: boolean, path: string, maxAge: number}} Cookie options.
 */
export function sessionCookieOptions(isProduction = config.isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: parseDuration(config.jwtExpiresIn),
  };
}

/**
 * Decide where a successful sign-in may redirect.
 *
 * `next` arrives in the URL, so anyone can write it. Only a path on this site
 * is honoured: a scheme, a protocol-relative `//host` or a `/\host` (which
 * browsers read as `//host`) would turn the login page into a redirect to
 * somewhere else.
 *
 * @param {unknown} raw - The `next` value from the query or form.
 * @returns {string} A same-site path.
 */
export function safeNext(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return DEFAULT_AFTER_LOGIN;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_AFTER_LOGIN;
  return raw;
}
