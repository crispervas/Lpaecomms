/**
 * @file Paged catalogue API controller.
 *
 * Serves the product catalogue a page at a time, optionally filtered to one
 * category, to the mobile and desktop clients. Part of the API layer: it
 * validates the query, asks the models, and returns JSON. Distinct from
 * catalog.controller.js, which renders the web catalog page.
 */

import boom from '@hapi/boom';

/** Page size when the client names none. */
const DEFAULT_LIMIT = 12;

/** Largest page a client may ask for; bounds the feed request it causes. */
const MAX_LIMIT = 24;

/**
 * Deepest offset accepted. The feed is small; the cap only keeps absurd
 * values (and their exponent notation) out of the feed URL.
 */
const MAX_OFFSET = 10000;

/** A plain non-negative integer: no sign, decimal point or exponent. */
const PLAIN_INTEGER = /^\d+$/;

const UNAVAILABLE = 'The product catalogue source is unavailable.';

/**
 * Read an optional integer query parameter.
 *
 * @param {unknown} value - The raw query value; an array when repeated.
 * @param {string} name - Parameter name, for the error message.
 * @param {number} fallback - Value when the parameter is absent.
 * @param {number} min - Smallest accepted value.
 * @param {number} max - Largest accepted value.
 * @returns {number} The parsed value.
 * @throws {import('@hapi/boom').Boom} 400 when the value is not a plain integer in range.
 */
function readInteger(value, name, fallback, min, max) {
  if (value === undefined) return fallback;

  if (typeof value !== 'string' || !PLAIN_INTEGER.test(value)) {
    throw boom.badRequest(`Parameter "${name}" must be a whole number.`);
  }

  const number = Number(value);
  if (number < min || number > max) {
    throw boom.badRequest(`Parameter "${name}" must be between ${min} and ${max}.`);
  }

  return number;
}

/**
 * Controller for the paged catalogue endpoint.
 */
export class CatalogApiController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   * @param {import('../models/category.model.js').CategoryModel} categoryModel - Injected category model.
   */
  constructor(productModel, categoryModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
    /** @type {import('../models/category.model.js').CategoryModel} */
    this.categoryModel = categoryModel;
  }

  /**
   * Resolve a category slug to its feed id.
   *
   * @param {string} slug - Category slug from the query.
   * @returns {Promise<number>} The category's feed id.
   * @throws {import('@hapi/boom').Boom} 404 for an unknown slug; 502 when the
   *   category list cannot be read, because then the filter cannot be resolved.
   */
  async #categoryId(slug) {
    let categories;
    try {
      categories = await this.categoryModel.listCategories();
    } catch (error) {
      throw boom.badGateway(UNAVAILABLE, { cause: error.message });
    }

    const match = categories.find((category) => category.slug === slug);
    if (!match) throw boom.notFound(`Category "${slug}" does not exist.`);

    return match.id;
  }

  /**
   * Return one page of the catalogue.
   *
   * @param {import('express').Request} req - Incoming request; reads `category`, `offset` and `limit`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      const offset = readInteger(req.query.offset, 'offset', 0, 0, MAX_OFFSET);
      const limit = readInteger(req.query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
      const { category } = req.query;

      // Express turns a repeated parameter into an array; only one plain,
      // non-empty string can name a category.
      if (category !== undefined && (typeof category !== 'string' || category === '')) {
        throw boom.badRequest('Parameter "category" must be a single category slug.');
      }

      const categoryId = category ? await this.#categoryId(category) : null;

      // The feed reports no total, so one extra product is requested: its
      // presence is what says another page exists.
      const page = await this.productModel.listByCategory(categoryId, limit + 1, offset);

      res.json({
        products: page.slice(0, limit),
        offset,
        limit,
        hasMore: page.length > limit,
      });
    } catch (error) {
      next(error.isBoom ? error : boom.badGateway(UNAVAILABLE, { cause: error.message }));
    }
  }
}
