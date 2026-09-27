/**
 * @file Home controller.
 *
 * Handles the storefront home page. Part of the view layer: it reads the
 * request, selects a template, and renders HTML. It never builds database
 * queries — that is the model layer's responsibility.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RECENT_COOKIE, parseRecent } from '../lib/recentlyViewed.js';

/** Absolute path to the static image directory. */
const IMAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');

/**
 * Hero photograph filenames, in preference order. Three extensions are accepted
 * so the supplied asset can be dropped in whatever format it arrives without a
 * rename.
 */
const HERO_IMAGE_CANDIDATES = ['hero-product.webp', 'hero-product.jpg', 'hero-product.png'];

/** The mockup's trending grid holds eight cards. */
const FEATURED_LIMIT = 8;

/** The "Picked for you" row holds four cards, like the detail page's related row. */
const PICKED_COUNT = 4;

/**
 * Find the hero photograph among the accepted filenames.
 *
 * The asset is supplied by hand and may not be in the tree yet. Returning null
 * instead of a fixed path is what lets the hero fall back to its coloured block
 * rather than rendering a broken-image icon.
 *
 * @param {string} [imageDir] - Directory to search; overridable for tests.
 * @returns {string|null} A public URL, or null when no candidate exists.
 */
export function resolveHeroImage(imageDir = IMAGE_DIR) {
  const filename = HERO_IMAGE_CANDIDATES.find((candidate) =>
    fs.existsSync(path.join(imageDir, candidate)),
  );

  return filename ? `/img/${filename}` : null;
}

/**
 * Resolved once at load: static assets ship with the application and cannot
 * appear mid-process, so a per-request stat would buy nothing.
 */
const heroImage = resolveHeroImage();

/**
 * Find the category a visitor has looked at most.
 *
 * Ties break toward the more recently viewed product, because `findByIds`
 * returns newest first and the first category to reach a count keeps it. That
 * is the right bias: a visitor who has just switched interest is telling us
 * something more current than the tally is.
 *
 * @param {Array<{categoryId: number|null}>} products - Recently viewed products.
 * @returns {number|null} The dominant category id, or null when there is none.
 */
function dominantCategoryId(products) {
  const counts = new Map();

  for (const { categoryId } of products) {
    if (categoryId === null || categoryId === undefined) continue;

    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  let dominant = null;
  let best = 0;

  for (const [categoryId, count] of counts) {
    if (count > best) {
      dominant = categoryId;
      best = count;
    }
  }

  return dominant;
}

/**
 * Controller for the storefront home page.
 */
export class HomeController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   */
  constructor(productModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
  }

  /**
   * Render the home page.
   *
   * Reads the catalogue through the model rather than over HTTP: a view route
   * that called the JSON route would tie the site's rendering to the API's
   * response shape, which mobile and desktop must stay free to change.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async index(req, res) {
    // The trending grid and the personal blocks read unrelated parts of the
    // feed, so they are fetched side by side: the page waits for the slower of
    // the two rather than for both in turn. Neither can reject — each turns
    // its own failure into an empty section.
    const [products, { recentlyViewed, pickedForYou }] = await Promise.all([
      this.#featured(),
      this.#personalise(req),
    ]);

    res.render('layouts/base', {
      title: 'Lpaecomms — Home',
      page: 'home',
      heroImage,
      products,
      recentlyViewed,
      pickedForYou,
    });
  }

  /**
   * Fetch the trending grid.
   *
   * Failing the whole page because the catalogue could not be read would be
   * worse than rendering one section short, so the failure is recorded and the
   * template shows a notice in place of the grid instead of the products it
   * could not fetch.
   *
   * @returns {Promise<Array<Object>>} The products; empty when the read failed.
   */
  async #featured() {
    try {
      return await this.productModel.listFeatured(FEATURED_LIMIT);
    } catch (error) {
      console.error('🪵 Home: featured products unavailable:', {
        message: error.message,
      });
      return [];
    }
  }

  /**
   * Build the two blocks derived from what this visitor has browsed.
   *
   * Nobody asked for these and nobody configured them, which is what separates
   * them from the appearance controls: the history is a record of behaviour and
   * "Picked for you" is an inference drawn from it.
   *
   * Every failure here resolves to empty rather than throwing. These blocks are
   * an extra; a recommendation that cannot be built must never be the reason the
   * storefront has no front page.
   *
   * @param {import('express').Request} req - Incoming request, read for cookies.
   * @returns {Promise<{recentlyViewed: Array<Object>, pickedForYou: Array<Object>}>}
   *   Both lists, either of which may be empty.
   */
  async #personalise(req) {
    const history = parseRecent(req.cookies?.[RECENT_COOKIE]);

    // A first-time visitor has nothing to personalise from, and asking the feed
    // about an empty list would be a request with no possible answer.
    if (history.length === 0) {
      return { recentlyViewed: [], pickedForYou: [] };
    }

    let recentlyViewed;

    try {
      recentlyViewed = await this.productModel.findByIds(history);
    } catch (error) {
      // The history lookup itself failed, and "Picked for you" has nothing to
      // infer from without it, so this one failure costs both blocks rather
      // than one being rebuilt on data that could not be read.
      console.error('🪵 Home: browsing history unavailable:', {
        message: error.message,
      });

      return { recentlyViewed: [], pickedForYou: [] };
    }

    const categoryId = dominantCategoryId(recentlyViewed);

    if (categoryId === null) {
      return { recentlyViewed, pickedForYou: [] };
    }

    // Kept in its own try/catch, separate from the history lookup above: this
    // call is the one documented to throw, and its failure must cost only the
    // inferred strip, not the history the visitor already has in hand.
    try {
      const pickedForYou = await this.productModel.findByCategoryExcluding(
        categoryId,
        recentlyViewed.map((product) => product.id),
        PICKED_COUNT,
      );

      return { recentlyViewed, pickedForYou };
    } catch (error) {
      console.error('🪵 Home: recommendation unavailable:', {
        message: error.message,
      });

      return { recentlyViewed, pickedForYou: [] };
    }
  }
}
