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
    let products = [];

    try {
      products = await this.productModel.listFeatured(FEATURED_LIMIT);
    } catch (error) {
      // The catalogue is a third party. Failing the whole page because a demo
      // feed is down would be worse than rendering one section short, so the
      // failure is recorded and the template omits the section.
      console.error('🪵 Home: featured products unavailable:', {
        message: error.message,
      });
    }

    res.render('layouts/base', {
      title: 'Lpaecomms — Home',
      page: 'home',
      heroImage,
      products,
    });
  }
}
