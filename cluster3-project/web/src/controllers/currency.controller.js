/**
 * @file Currency controller.
 *
 * API endpoint that converts a price between the store's supported currencies.
 * Part of the API layer: it validates the query, orchestrates the currency
 * model, and returns JSON. Validation lives here rather than in the model
 * because "what is a valid request" is an HTTP concern.
 */

import boom from '@hapi/boom';
import { CurrencyModel } from '../models/currency.model.js';

/**
 * Controller for the currency conversion endpoint.
 */
export class CurrencyController {
  /**
   * @param {CurrencyModel} currencyModel - Injected currency model.
   */
  constructor(currencyModel) {
    /** @type {CurrencyModel} */
    this.currencyModel = currencyModel;
  }

  /**
   * Convert an amount between two supported currencies.
   *
   * @param {import('express').Request} req - Incoming request; reads `have`, `want` and `amount` from the query.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {Promise<void>}
   */
  async convert(req, res, next) {
    try {
      const have = String(req.query.have ?? '').toUpperCase();
      const want = String(req.query.want ?? '').toUpperCase();
      const amount = Number(req.query.amount);
      const supported = CurrencyModel.supportedCurrencies;

      // Validation runs before the configuration check on purpose: a malformed
      // request is the caller's fault whether or not this environment happens
      // to hold a provider key, and answering 503 to it would be misleading.
      if (!supported.includes(have) || !supported.includes(want)) {
        throw boom.badRequest(
          `Parameters "have" and "want" must be one of: ${supported.join(', ')}.`,
        );
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw boom.badRequest('Parameter "amount" must be a positive number.');
      }

      if (!this.currencyModel.isConfigured) {
        throw boom.serverUnavailable('Currency conversion is not configured.');
      }

      const result = await this.currencyModel.convert(have, want, amount);

      res.json({ have, want, amount, ...result });
    } catch (error) {
      // A Boom error already carries the status this controller chose. Anything
      // else came out of the model, which means the provider failed: 502.
      //
      // The cause travels as data, never as the second argument's Error form:
      // Boom boomifies an Error there and merges its message into the payload,
      // and Boom only redacts a message for a 500. A provider's 401 or 403 must
      // never surface to a client, which is exactly what merging would do.
      next(
        error.isBoom
          ? error
          : boom.badGateway('The currency provider is unavailable.', { cause: error.message }),
      );
    }
  }
}
