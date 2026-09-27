/**
 * @file Role-based authorisation.
 *
 * Runs after `authenticate`. Kept separate so a route can be authenticated
 * without being restricted to a role.
 */

import boom from '@hapi/boom';

/**
 * Allow only the listed role codes.
 *
 * @param {...string} roles - Role codes allowed through, e.g. "ADMIN".
 * @returns {import('express').RequestHandler} Middleware answering 401 without
 *   a user and 403 for any other role.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(boom.unauthorized('Sign in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(boom.forbidden('You do not have permission to do this.'));
    }
    next();
  };
}
