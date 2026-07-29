/**
 * @file Product controller.
 *
 * API endpoint that serves the product catalogue with store locations. Part of
 * the API layer: it orchestrates the product model and returns JSON. It builds
 * no error responses itself — it forwards Boom errors to the shared error
 * middleware so every API failure has the same shape.
 */

import boom from '@hapi/boom';

/**
 * Controller for the product catalogue endpoint.
 */
export class ProductController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   */
  constructor(productModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
  }

  /**
   * List the catalogue products with their store locations.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      res.json(await this.productModel.listWithLocations());
    } catch (error) {
      // Boom only redacts a 500's message, so an Error passed as the second
      // argument here would be merged into the 502 message and reach every
      // client, in every environment, including production. Passing the cause
      // as plain data keeps the client message generic while `logErrors` still
      // records the detail server-side via `err.data`.
      next(boom.badGateway('The product catalogue source is unavailable.', { cause: error.message }));
    }
  }
}
