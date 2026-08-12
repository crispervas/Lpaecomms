/**
 * @file Catalog controller.
 *
 * Handles the storefront catalog page. Part of the view layer: it reads the
 * request, selects a template, and renders HTML. It reads the catalogue through
 * the model rather than over HTTP — a view route that called the JSON route
 * would tie the site's rendering to the API's response shape, which mobile and
 * desktop must stay free to change.
 */

/** The catalog's grid is three rows of four. */
const CATALOG_LIMIT = 12;

/**
 * Controller for the storefront catalog page.
 */
export class CatalogController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   */
  constructor(productModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
  }

  /**
   * Render the catalog page.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async index(req, res) {
    let products = [];
    // Tracked separately from `products.length` because an empty array has two
    // meanings the user is owed the difference between: a feed that fell over
    // is not a catalogue that happens to be empty.
    let catalogueAvailable = true;

    try {
      products = await this.productModel.listByCategory(null, CATALOG_LIMIT);
    } catch (error) {
      catalogueAvailable = false;
      console.error('🪵 Catalog: products unavailable:', { message: error.message });
    }

    res.render('layouts/base', {
      title: 'Lpaecomms — Catalog',
      page: 'catalog',
      products,
      catalogueAvailable,
    });
  }
}
