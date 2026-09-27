/**
 * @file Bearer token authentication.
 *
 * Reads `Authorization: Bearer <jwt>`, verifies it and sets `req.user`. Every
 * failure is the same 401 on purpose: telling an expired token from a forged
 * one helps an attacker more than a client.
 */

import boom from '@hapi/boom';
import { verifyToken } from '../lib/jwt.js';

/**
 * Require a valid access token.
 *
 * @param {import('express').Request} req - Reads the Authorization header.
 * @param {import('express').Response} res - Unused.
 * @param {import('express').NextFunction} next - Continues, or forwards a 401.
 * @returns {void}
 */
export function authenticate(req, res, next) {
  const header = req.headers?.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(boom.unauthorized('Sign in to continue.'));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(boom.unauthorized('Sign in to continue.'));
  }
}
