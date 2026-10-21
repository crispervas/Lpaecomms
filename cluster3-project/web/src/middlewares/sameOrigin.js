/**
 * @file Same-origin guard for the site's form posts (view side).
 *
 * `sameSite: 'lax'` keeps the session cookie off a cross-site POST, but it
 * does not stop such a POST from *setting* one: another site could
 * auto-submit the login form with its own account and sign the visitor into
 * it ("login CSRF"), then read the address they save and the orders they
 * place. Browsers say where a form post came from in `Sec-Fetch-Site` and
 * `Origin`, and neither can be forged by a page, so a post that says it came
 * from elsewhere is refused before it reaches any controller.
 *
 * A request carrying neither header did not come from a modern browser form,
 * so it cannot be riding a visitor's browser, and is let through.
 */

import boom from '@hapi/boom';

/** Methods that change nothing and need no check. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether an `Origin` header names this host.
 *
 * @param {string} origin - The header's value.
 * @param {string|undefined} host - The request's Host header.
 * @returns {boolean} True for the same host; false for another or for "null".
 */
function sameHost(origin, host) {
  try {
    return new URL(origin).host === host;
  } catch {
    // "null" (sandboxed frames, some redirects) and anything unparsable.
    return false;
  }
}

/**
 * Refuse a state-changing request that a browser reports as cross-origin.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Unused.
 * @param {import('express').NextFunction} next - Continues, or receives a 403.
 * @returns {void}
 */
export function requireSameOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const fetchSite = req.get('sec-fetch-site');
  const origin = req.get('origin');

  // "none" is a navigation the visitor started themselves (a bookmark).
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return next(boom.forbidden('This form was sent from another site.'));
  }
  if (origin !== undefined && !sameHost(origin, req.get('host'))) {
    return next(boom.forbidden('This form was sent from another site.'));
  }
  return next();
}
