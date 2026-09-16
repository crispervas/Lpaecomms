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
 * @returns {{httpOnly: boolean, sameSite: string, secure: boolean, maxAge: number, path: string}}
 *   Options ready to hand to `res.cookie`.
 */
export function persistentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: PERSISTENT_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}
