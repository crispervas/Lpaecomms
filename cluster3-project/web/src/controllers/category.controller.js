/**
 * @file Category API controller.
 *
 * Serves the product categories to the mobile and desktop clients. Part of the
 * API layer: it asks the category model and returns JSON. Failures go to the
 * shared error middleware as Boom errors so every API error has one shape.
 */

import boom from '@hapi/boom';

/**
 * Controller for the category list endpoint.
 */
export class CategoryController {
  /**
   * @param {import('../models/category.model.js').CategoryModel} categoryModel - Injected category model.
   */
  constructor(categoryModel) {
    /** @type {import('../models/category.model.js').CategoryModel} */
    this.categoryModel = categoryModel;
  }

  /**
   * List the categories that currently hold at least one product.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      const categories = await this.categoryModel.listCategories();
      // Wrapped in an object so metadata can be added without changing the root type.
      res.json({ categories });
    } catch (error) {
      // The cause travels as data so it is logged but never sent to clients.
      next(
        error.isBoom
          ? error
          : boom.badGateway('The category source is unavailable.', { cause: error.message }),
      );
    }
  }
}
