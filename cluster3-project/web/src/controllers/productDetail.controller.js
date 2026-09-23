/**
 * @file Product detail controller.
 *
 * Handles the storefront's single-product page. Part of the view layer: it
 * reads the request, selects a template, and renders HTML. It reads the
 * catalogue through the model rather than over HTTP — a view route that called
 * the JSON route would tie the site's rendering to the API's response shape,
 * which mobile and desktop must stay free to change.
 *
 * Named `productDetail` rather than `product` because
 * `controllers/product.controller.js` already belongs to the API, which serves
 * the mobile and desktop clients. Renaming that one for symmetry would move a
 * file two other platforms depend on, to buy nothing.
 */

import { persistentCookieOptions } from '../config/cookies.js';
import {
  RECENT_COOKIE,
  parseRecent,
  pushRecent,
  serialiseRecent,
} from '../lib/recentlyViewed.js';

/**
 * Ask for five to show four: the product being viewed is usually among its own
 * category's first results, and filtering it out of four would leave three.
 */
const RELATED_FETCH_LIMIT = 5;

/** The mockup's "You might also like" row holds four cards. */
const RELATED_COUNT = 4;

/**
 * Controller for the storefront's product detail page.
 */
export class ProductDetailController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   */
  constructor(productModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
  }

  /**
   * Render one product's page.
   *
   * @param {import('express').Request} req - Incoming request; `id` is read from the path.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Falls through to the shared
   *   404 page when the requested product does not exist.
   * @returns {Promise<void>}
   */
  async show(req, res, next) {
    const id = Number(req.params.id);

    // Validated before any network call: an id that cannot name a product is
    // not worth a request to a third party.
    if (!Number.isInteger(id) || id < 1) return next();

    // A failure here is deliberately not caught, unlike on the home and catalog
    // pages. Those own content of their own and lose a section; this page IS
    // the product, so rendering it without one would claim to describe
    // something that could not be read. The rejection reaches the error
    // middleware and the error page.
    const product = await this.productModel.getById(id);
    if (!product) return next();

    // Recorded only once the product is known to exist, so a mistyped URL does
    // not teach the home page about something that is not there. The visitor is
    // never asked and never maintains this: it is the behaviour the home page's
    // recommendations are inferred from.
    const history = pushRecent(parseRecent(req.cookies?.[RECENT_COOKIE]), id);
    res.cookie(RECENT_COOKIE, serialiseRecent(history), persistentCookieOptions());

    let related = [];

    // Related products are an extra: unlike the product itself, losing them
    // costs a section rather than the page.
    if (product.category.id !== null) {
      try {
        const sameCategory = await this.productModel.listByCategory(
          product.category.id,
          RELATED_FETCH_LIMIT,
        );

        related = sameCategory
          .filter((candidate) => candidate.id !== product.id)
          .slice(0, RELATED_COUNT);
      } catch (error) {
        console.error('🪵 Product detail: related products unavailable:', {
          message: error.message,
        });
      }
    }

    res.render('layouts/base', {
      title: `${product.name} — Lpaecomms`,
      page: 'productDetail',
      product,
      related,
    });
  }
}
