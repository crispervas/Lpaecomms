/**
 * @file Cart controller.
 *
 * Serves the Cart page — the first step of the checkout mockup — and the three
 * form posts that change the cart: add a product, set a line's quantity, and
 * remove a line. Every change answers with a 303 back to /cart, so a reload
 * never re-submits and the whole cart works with no JavaScript.
 *
 * The cart is the `lpa_cart` cookie (lib/cart.js). Names and prices come from
 * the catalogue through the model on every render, never from the cookie.
 *
 * The cart never holds more than the shop has: every render lowers lines to
 * the current stock and drops sold-out products, saying so, and adding a
 * product adds at most what is left. The payment step re-checks, because the
 * stock can still change after this page.
 *
 * "Continue to shipping" opens the checkout (checkout.controller.js), which
 * asks for a sign-in first.
 */

import boom from '@hapi/boom';
import { persistentCookieOptions } from '../config/cookies.js';
import {
  CART_COOKIE,
  MAX_LINES,
  addToCart,
  capToStock,
  cartCount,
  parseCart,
  parseProductId,
  priceCart,
  removeFromCart,
  serialiseCart,
  setQuantity,
} from '../lib/cart.js';

/** Notices a redirect may ask the page to show, keyed by `?notice=`. */
export const NOTICES = {
  full: `Your cart holds up to ${MAX_LINES} different products. Remove one to add another.`,
  stock: 'Some quantities were reduced to what we have in stock.',
};

/**
 * Controller for the Cart page and its form posts.
 */
export class CartController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Injected product model.
   */
  constructor(productModel) {
    /** @type {import('../models/product.model.js').ProductModel} */
    this.productModel = productModel;
  }

  /**
   * Render the cart, priced from the catalogue.
   *
   * Each line is looked up on its own so one outcome cannot cost the others.
   * A product the catalogue says does not exist is gone for good and is
   * pruned from the cookie; a product that could not be *read* is kept, since
   * the feed failing for a moment is no reason to empty someone's cart, and
   * the page says some items could not be shown.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async show(req, res) {
    const lines = this.#read(req);

    const results = await Promise.all(
      lines.map(async (line) => {
        try {
          return { line, product: await this.productModel.getById(line.id) };
        } catch (error) {
          console.error('🪵 Cart: product unavailable:', { id: line.id, message: error.message });
          return { line, product: undefined };
        }
      }),
    );

    const found = results.filter((result) => result.product);
    const existing = results.filter((result) => result.product !== null).map((result) => result.line);
    const { lines: kept, changed: capped } = capToStock(
      existing,
      new Map(found.map(({ product }) => [product.id, product.stock])),
    );
    if (kept.length !== lines.length || capped) {
      this.#write(res, kept);
      // The header badge was counted from the cookie before the prune.
      res.locals.cartCount = cartCount(kept);
    }

    const productById = new Map(found.map(({ product }) => [product.id, product]));
    const { items, subtotalAud } = priceCart(
      kept
        .filter((line) => productById.has(line.id))
        .map((line) => {
          const product = productById.get(line.id);
          return {
            product: {
              id: product.id,
              name: product.name,
              category: product.category.name,
              priceAud: product.priceAud,
              imageUrl: product.imageUrls[0] ?? '',
              stock: product.stock,
            },
            quantity: line.quantity,
          };
        }),
    );
    const unavailableCount = results.filter((result) => result.product === undefined).length;

    // Whitelisted: the query string is public, and only known keys map to copy.
    let notice = Object.hasOwn(NOTICES, req.query.notice) ? NOTICES[req.query.notice] : null;
    if (capped) notice = NOTICES.stock;

    res.render('layouts/base', {
      title: 'Lpaecomms — Cart',
      page: 'cart',
      items,
      subtotalAud,
      unavailableCount,
      notice,
      // Lines that could not be read have no price yet, so an order now would
      // be charged for something the visitor cannot see.
      canCheckout: items.length > 0 && unavailableCount === 0,
    });
  }

  /**
   * Add a product from its page.
   *
   * The product is looked up first so the cookie never records an id the
   * catalogue does not know, and the line never holds more than the stock;
   * when it had to add less than asked, the cart says so.
   *
   * @param {import('express').Request} req - Body carries `productId` and `quantity`.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   * @throws {import('@hapi/boom').Boom} 400 when the id cannot name a product;
   *   404 when the catalogue has no such product.
   */
  async add(req, res) {
    const id = parseProductId(req.body.productId);
    if (id === null) throw boom.badRequest('That is not a product.');

    const product = await this.productModel.getById(id);
    if (!product) throw boom.notFound('That product no longer exists.');

    const lines = this.#read(req);
    const updated = addToCart(lines, id, req.body.quantity);

    // addToCart refuses a new product once the cart is full, leaving it as it was.
    if (updated === lines) {
      res.redirect(303, '/cart?notice=full');
      return;
    }

    const { lines: capped, changed } = capToStock(updated, new Map([[id, product.stock]]));
    // A sold-out product leaves the cart exactly as it was.
    if (capped.length !== lines.length || capped.some((line, i) => line !== lines[i])) this.#write(res, capped);
    res.redirect(303, changed ? '/cart?notice=stock' : '/cart');
  }

  /**
   * Set one line's quantity, from the cart page's stepper.
   *
   * @param {import('express').Request} req - `id` in the path, `quantity` in the body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   * @throws {import('@hapi/boom').Boom} 400 when the id cannot name a product.
   */
  update(req, res) {
    const id = this.#pathId(req);
    this.#write(res, setQuantity(this.#read(req), id, req.body.quantity));
    res.redirect(303, '/cart');
  }

  /**
   * Remove one line.
   *
   * @param {import('express').Request} req - `id` in the path.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   * @throws {import('@hapi/boom').Boom} 400 when the id cannot name a product.
   */
  remove(req, res) {
    const id = this.#pathId(req);
    this.#write(res, removeFromCart(this.#read(req), id));
    res.redirect(303, '/cart');
  }

  /**
   * Read the path's product id.
   *
   * @param {import('express').Request} req - Incoming request.
   * @returns {number} The id.
   * @throws {import('@hapi/boom').Boom} 400 when it cannot name a product.
   */
  #pathId(req) {
    const id = parseProductId(req.params.id);
    if (id === null) throw boom.badRequest('That is not a product.');
    return id;
  }

  /**
   * Read the request's cart.
   *
   * @param {import('express').Request} req - Incoming request.
   * @returns {import('../lib/cart.js').CartLine[]} The lines.
   */
  #read(req) {
    return parseCart(req.cookies?.[CART_COOKIE]);
  }

  /**
   * Write the cart back, or clear the cookie once it is empty so an empty cart
   * leaves nothing behind in the browser.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('../lib/cart.js').CartLine[]} lines - The lines to keep.
   * @returns {void}
   */
  #write(res, lines) {
    if (lines.length === 0) {
      const { maxAge, ...options } = persistentCookieOptions();
      res.clearCookie(CART_COOKIE, options);
      return;
    }
    res.cookie(CART_COOKIE, serialiseCart(lines), persistentCookieOptions());
  }
}
