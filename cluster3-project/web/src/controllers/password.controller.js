/**
 * @file Password controller.
 *
 * API endpoint backing the password breach check. It accepts only a five
 * character hash prefix, never a password: the caller hashes locally, sends the
 * prefix, and compares the returned suffixes itself. Rejecting anything that is
 * not a prefix is what keeps that promise enforceable rather than advisory.
 */

import boom from '@hapi/boom';
import { BreachModel } from '../models/breach.model.js';

/**
 * Controller for the breached password lookup endpoint.
 */
export class PasswordController {
  /**
   * @param {BreachModel} breachModel - Injected breach model.
   */
  constructor(breachModel) {
    /** @type {BreachModel} */
    this.breachModel = breachModel;
  }

  /**
   * Return the known breached hash suffixes for a prefix.
   *
   * @param {import('express').Request} req - Incoming request; reads `prefix` from the query.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {Promise<void>}
   */
  async check(req, res, next) {
    try {
      const prefix = String(req.query.prefix ?? '').toUpperCase();

      if (!BreachModel.prefixPattern.test(prefix)) {
        throw boom.badRequest(
          'Parameter "prefix" must be exactly five hexadecimal characters.',
        );
      }

      const suffixes = await this.breachModel.findSuffixes(prefix);

      res.json({ prefix, count: Object.keys(suffixes).length, suffixes });
    } catch (error) {
      // The cause travels as data, never as the second argument's Error form:
      // Boom boomifies an Error there and merges its message into the payload,
      // and Boom only redacts a message for a 500.
      next(
        error.isBoom
          ? error
          : boom.badGateway('The breach lookup service is unavailable.', { cause: error.message }),
      );
    }
  }
}
