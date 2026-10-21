/**
 * @file Catalog controller.
 *
 * Handles the storefront catalog page. Part of the view layer: it reads the
 * request, selects a template, and renders HTML. It reads the catalogue through
 * the model rather than over HTTP — a view route that called the JSON route
 * would tie the site's rendering to the API's response shape, which mobile and
 * desktop must stay free to change.
 */

import { parseCatalogQuery } from '../lib/catalogQuery.js';

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
   * Render one page of the catalog, optionally filtered to one category and
   * to a search.
   *
   * @param {import('express').Request} req - Incoming request; `q`, `page`
   *   and `category` are read from the query string.
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

    const { q, page, category: requestedSlug } = parseCatalogQuery(req.query);
    const activeCategory = categories.find((category) => category.slug === requestedSlug) ?? null;

    // A slug matching nothing is a URL for a category that does not exist — but
    // only when the list actually loaded. With the list unavailable there is no
    // way to know, and a 404 would turn a valid URL dead because a third party
    // was down.
    if (requestedSlug && !activeCategory && categoriesAvailable) {
      return next();
    }

    let products = [];
    let total = 0;
    let pageCount = 1;
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
        ({ items: products, total, pageCount } = await this.productModel.search({
          categoryId: activeCategory ? activeCategory.id : null,
          q,
          page,
        }));
      } catch (error) {
        catalogueAvailable = false;
        console.error('🪵 Catalog: products unavailable:', { message: error.message });
      }
    }

    let title = 'Lpaecomms — Catalog';
    if (q) title = `Lpaecomms — Results for "${q}"`;
    else if (activeCategory) title = `Lpaecomms — ${activeCategory.name}`;

    res.render('layouts/base', {
      title,
      // `page` already names the layout's template, hence `pageNumber` below.
      page: 'catalog',
      categories,
      activeCategory,
      products,
      catalogueAvailable,
      q,
      pageNumber: page,
      pageCount,
      total,
    });
  }
}
