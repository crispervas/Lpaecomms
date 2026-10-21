/**
 * @file Customer session middleware (view side).
 *
 * `customerSession` reads the session cookie on every page request and puts
 * the signed-in customer on `req.customer` and `res.locals.customer` (null for
 * a visitor), so controllers and the header can tell them apart. The token
 * alone is not trusted to be current: the account is re-read each time, so a
 * customer an admin blocks or deletes is signed out on their next request.
 *
 * `requireCustomer` guards the pages that need an account.
 */

import { verifyToken } from '../lib/jwt.js';
import { SESSION_COOKIE, sessionCookieOptions } from '../lib/session.js';

/**
 * Drop the session cookie, matching the options it was set with.
 *
 * @param {import('express').Response} res - Outgoing response.
 * @returns {void}
 */
function clearSession(res) {
  const { maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

/**
 * Build the middleware that resolves the session cookie.
 *
 * @param {{findActive: (id: number) => Promise<Object|null>}} customerModel - Injected model.
 * @returns {import('express').RequestHandler} Middleware that never fails the request.
 */
export function customerSession(customerModel) {
  return async (req, res, next) => {
    req.customer = null;
    res.locals.customer = null;

    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return next();

    let claims;
    try {
      claims = verifyToken(token);
    } catch {
      clearSession(res);
      return next();
    }

    // Admins work in the desktop app; their token is no web session.
    if (claims.role !== 'CUSTOMER') {
      clearSession(res);
      return next();
    }

    try {
      const user = await customerModel.findActive(claims.id);
      if (!user) {
        clearSession(res);
        return next();
      }
      const customer = { id: user.id, name: user.name, lastName: user.lastName, email: user.email };
      req.customer = customer;
      res.locals.customer = customer;
    } catch (error) {
      // The database being down is no reason to sign anyone out: the cookie
      // stays, the page renders as for a visitor, and the next request retries.
      console.error('🪵 Session: customer lookup failed:', { message: error.message });
    }
    return next();
  };
}

/**
 * Send a visitor without a session to the login page, and back here after.
 *
 * @param {import('express').Request} req - Request, after customerSession.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Continues for a customer.
 * @returns {void}
 */
export function requireCustomer(req, res, next) {
  if (req.customer) return next();
  // 303 so a guarded POST is retried as a GET of the login page.
  res.redirect(303, `/login?next=${encodeURIComponent(req.originalUrl)}`);
}
