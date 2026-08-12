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
   * @param {import('../models/category.model.js').CategoryModel} categoryModel - Injected category model.
   */
  constructor(productModel, categoryModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
    /** @type {import('../models/category.model.js').CategoryModel} */
    this.categoryModel = categoryModel;
  }

  /**
   * Render the catalog page, optionally filtered to one category.
   *
   * @param {import('express').Request} req - Incoming request; `category` is
   *   read from the query string.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Used to fall through to the
   *   shared 404 page when the requested category does not exist.
   * @returns {Promise<void>}
   */
  async index(req, res, next) {
    let categories = [];
    let categoriesAvailable = true;

    try {
      categories = await this.categoryModel.listCategories();
    } catch (error) {
      categoriesAvailable = false;
      console.error('🪵 Catalog: categories unavailable:', { message: error.message });
    }

    // Express parses a repeated query parameter into an array; only a plain
    // string can name a category.
    const requestedSlug = typeof req.query.category === 'string' ? req.query.category : null;
    const activeCategory = categories.find((category) => category.slug === requestedSlug) ?? null;

    // A slug matching nothing is a URL for a category that does not exist — but
    // only when the list actually loaded. With the list unavailable there is no
    // way to know, and a 404 would turn a valid URL dead because a third party
    // was down.
    if (requestedSlug && !activeCategory && categoriesAvailable) {
      return next();
    }

    let products = [];
    // Tracked separately from `products.length` because an empty array has two
    // meanings the user is owed the difference between: a feed that fell over
    // is not a catalogue that happens to be empty.
    let catalogueAvailable = true;

    if (requestedSlug && !categoriesAvailable) {
      // The filter cannot be resolved, so neither can its products. Rendering
      // the unfiltered catalogue would silently ignore the URL's filter.
      catalogueAvailable = false;
    } else {
      try {
        products = await this.productModel.listByCategory(
          activeCategory ? activeCategory.id : null,
          CATALOG_LIMIT,
        );
      } catch (error) {
        catalogueAvailable = false;
        console.error('🪵 Catalog: products unavailable:', { message: error.message });
      }
    }

    res.render('layouts/base', {
      title: activeCategory ? `Lpaecomms — ${activeCategory.name}` : 'Lpaecomms — Catalog',
      page: 'catalog',
      categories,
      activeCategory,
      products,
      catalogueAvailable,
    });
  }
}
