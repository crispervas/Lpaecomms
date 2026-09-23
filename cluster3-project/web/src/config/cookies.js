/**
 * @file Cookie attributes.
 *
 * One definition of what a persistent first-party cookie looks like on this
 * site, so the appearance cookie and the browsing-history cookie cannot drift
 * into different security postures. `secure` is read from the environment
 * rather than branched on a hostname, which would break the moment staging
 * moved.
 */

import { config } from './env.js';

/** A year. These carry a preference, not a session. */
export const PERSISTENT_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Attributes for a persistent first-party cookie.
 *
 * `httpOnly` on purpose, even though a browser script reads the effect of these
 * cookies: the script never writes them. Every write goes through a route that
 * validates first, which is what keeps an edited cookie from becoming an
 * unvalidated value in the markup.
 *
 * @param {boolean} [isProduction] - Defaults to the live environment. The
 *   parameter exists so a test can ask for the production branch directly,
 *   the same way `HealthController` takes an injected model and `ProductModel`
 *   takes an injectable base URL — without it, `secure` could only be
 *   exercised by mutating `NODE_ENV` around the test.
 * @returns {{httpOnly: boolean, sameSite: string, secure: boolean, maxAge: number, path: string}}
 *   Options ready to hand to `res.cookie`.
 */
export function persistentCookieOptions(isProduction = config.isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: PERSISTENT_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}
