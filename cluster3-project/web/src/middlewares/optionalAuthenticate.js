/**
 * @file Optional authentication for public reads.
 *
 * Public routes answer anyone, but some show more to an administrator — draft
 * products, for one. This sets `req.user` when a valid Bearer token arrives and
 * otherwise carries on as anonymous: a bad or expired token must not turn a
 * public read into a 401, or a client holding a stale token (mobile) would lose
 * the catalogue it is entitled to.
 */

import { verifyToken } from '../lib/jwt.js';

/**
 * Attach the token's user when there is a valid one; never fail.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response (unused).
 * @param {import('express').NextFunction} next - Continues the chain.
 * @returns {void}
 */
export function optionalAuthenticate(req, res, next) {
  const [scheme, token] = (req.headers?.authorization ?? '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Anonymous it is; see the header comment.
    }
  }
  next();
}
