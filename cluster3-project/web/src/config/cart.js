/**
 * @file Cart badge middleware.
 *
 * Puts the number of units in the visitor's cart on `res.locals` so the header
 * on every page can show it. Counted from the cookie alone, with no catalogue
 * lookup: the badge is on every page, and a feed request per page view to
 * draw one number would make the whole site as slow as the feed.
 */

import { CART_COOKIE, cartCount, parseCart } from '../lib/cart.js';

/**
 * Resolve the request's cart count for every template.
 *
 * Never fails: an absent or edited cookie counts as whatever of it parses.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Passes control onward.
 * @returns {void}
 */
export function cartLocals(req, res, next) {
  res.locals.cartCount = cartCount(parseCart(req.cookies?.[CART_COOKIE]));
  next();
}
