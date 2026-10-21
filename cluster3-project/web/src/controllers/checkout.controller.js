/**
 * @file Checkout controller.
 *
 * The three steps after the cart: Shipping, Payment and the Confirmation. All
 * of them need a signed-in customer (the routes add requireCustomer) and the
 * first two a non-empty cart.
 *
 * Payment is **simulated**: the card form is validated and nothing is
 * charged. A valid card creates the order through PurchaseModel, which prices
 * every line from the catalogue and takes the stock in the same transaction;
 * the order records only the card's brand and last four digits. The number,
 * expiry and CVC are never stored, logged or rendered back.
 */

import boom from '@hapi/boom';
import { persistentCookieOptions } from '../config/cookies.js';
import { CART_COOKIE, parseCart, priceCart } from '../lib/cart.js';
import { CARD_FIELDS, cardSummary, normaliseCard, validateCard } from '../lib/cardValidation.js';
import { INT4_MAX } from '../lib/dbInt.js';
import {
  CHECKOUT_COOKIE,
  checkoutCookieOptions,
  orderReference,
  readShipping,
  serialiseShipping,
} from '../lib/checkout.js';
import { SHIPPING_FIELDS, normaliseShipping, validateShipping } from '../lib/shippingValidation.js';
import { stamp } from '../middlewares/audit.js';
import { CUSTOMER_ROLE } from '../models/customer.model.js';

/** The checkout forms' own script; it reads the rules from the markup. */
const CHECKOUT_SCRIPTS = ['/js/form-validation.js'];

/**
 * Controller for the checkout steps.
 */
export class CheckoutController {
  /**
   * @param {import('../models/product.model.js').ProductModel} productModel - Prices the cart.
   * @param {import('../models/customer.model.js').CustomerModel} customerModel - Profile and orders.
   * @param {import('../models/purchase.model.js').PurchaseModel} purchaseModel - Creates the order.
   */
  constructor(productModel, customerModel, purchaseModel) {
    this.productModel = productModel;
    this.customerModel = customerModel;
    this.purchaseModel = purchaseModel;
  }

  /**
   * Render the shipping form, filled from the cookie or, the first time, from
   * the customer's profile.
   *
   * @param {import('express').Request} req - Request with `req.customer`.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async showShipping(req, res) {
    if (this.#lines(req).length === 0) return res.redirect(303, '/cart');

    let values = readShipping(req.cookies?.[CHECKOUT_COOKIE]);
    if (!values) {
      const profile = await this.customerModel.findActive(req.customer.id);
      values = normaliseShipping({
        fullName: `${req.customer.name} ${req.customer.lastName}`.trim(),
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
      });
    }
    this.#renderShipping(res, { values });
  }

  /**
   * Validate the shipping form and keep it for the payment step.
   *
   * @param {import('express').Request} req - Request with the form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  saveShipping(req, res) {
    if (this.#lines(req).length === 0) return res.redirect(303, '/cart');

    const values = normaliseShipping(req.body);
    const errors = validateShipping(values);
    if (Object.keys(errors).length > 0) {
      res.status(422);
      this.#renderShipping(res, { values, errors });
      return;
    }

    res.cookie(CHECKOUT_COOKIE, serialiseShipping(values), checkoutCookieOptions());
    res.redirect(303, '/checkout/payment');
  }

  /**
   * Render the payment form beside the order summary.
   *
   * @param {import('express').Request} req - Request with `req.customer`.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async showPayment(req, res) {
    const state = await this.#paymentState(req, res);
    if (!state) return;
    this.#renderPayment(res, { ...state, values: { cardholder: `${req.customer.name} ${req.customer.lastName}`.trim() } });
  }

  /**
   * Take the simulated payment and create the order.
   *
   * @param {import('express').Request} req - Request with the card form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   * @throws {Error} Failures other than a stock or availability problem, for
   *   the error middleware.
   */
  async pay(req, res) {
    const state = await this.#paymentState(req, res);
    if (!state) return;

    const card = normaliseCard(req.body);
    const errors = validateCard(card);
    if (Object.keys(errors).length > 0) {
      res.status(422);
      // Only the cardholder comes back: the number, expiry and CVC are typed
      // again rather than written into the page, the cache and view-source.
      this.#renderPayment(res, { ...state, values: { cardholder: card.cardholder }, errors });
      return;
    }

    const now = new Date();
    let order;
    try {
      order = await this.purchaseModel.create({
        userId: req.customer.id,
        reference: orderReference(now),
        paymentStatus: 'SUCCESS',
        paymentDate: now,
        fulfillmentStatus: 'PENDING',
        products: state.lines.map((line) => ({ productId: line.id, quantity: line.quantity })),
        data: { shipping: state.shipping, payment: { method: 'card', ...cardSummary(card.cardNumber) } },
        created: {
          ...stamp({ time: now.toISOString(), user: { id: req.customer.id, role: CUSTOMER_ROLE } }),
          source: 'web',
        },
      });
    } catch (error) {
      // The stock ran out, or a product went away, after the cart was shown:
      // back to the cart, which caps and explains, with nothing charged.
      if (boom.isBoom(error, 409)) return res.redirect(303, '/cart?notice=stock');
      if (boom.isBoom(error, 400)) return res.redirect(303, '/cart');
      throw error;
    }

    // Cleared with the options each was set with, or the browser keeps them.
    const { maxAge, ...cartOptions } = persistentCookieOptions();
    res.clearCookie(CART_COOKIE, cartOptions);
    res.clearCookie(CHECKOUT_COOKIE, checkoutCookieOptions());
    res.redirect(303, `/checkout/confirmation/${order.id}`);
  }

  /**
   * Show a placed order to the customer who placed it.
   *
   * @param {import('express').Request} req - Request with `id` in the path.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Falls through to the 404 page.
   * @returns {Promise<void>}
   */
  async showConfirmation(req, res, next) {
    // Past int4 no order can exist, and PostgreSQL would reject the query.
    if (!/^\d+$/.test(req.params.id ?? '') || Number(req.params.id) > INT4_MAX) return next();
    // Scoped to the customer: someone else's order id is a 404, not a page.
    const order = await this.customerModel.getOrder(req.customer.id, Number(req.params.id));
    if (!order) return next();

    res.render('layouts/base', {
      title: 'Lpaecomms — Order confirmed',
      page: 'checkoutConfirmation',
      order,
    });
  }

  /**
   * Gather what the payment step needs, or redirect to the step that is missing.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response, redirected when incomplete.
   * @returns {Promise<{lines: Array<{id: number, quantity: number}>, shipping: Object, items: Array, subtotalAud: number}|null>}
   *   The state, or null after a redirect.
   */
  async #paymentState(req, res) {
    const lines = this.#lines(req);
    if (lines.length === 0) {
      res.redirect(303, '/cart');
      return null;
    }
    const shipping = readShipping(req.cookies?.[CHECKOUT_COOKIE]);
    if (!shipping) {
      res.redirect(303, '/checkout/shipping');
      return null;
    }

    const products = await Promise.all(lines.map((line) => this.productModel.getById(line.id)));
    // A product gone since the cart was shown: the cart prunes and explains.
    if (products.some((product) => !product)) {
      res.redirect(303, '/cart');
      return null;
    }

    const { items, subtotalAud } = priceCart(lines.map((line, i) => ({
      product: {
        id: products[i].id,
        name: products[i].name,
        category: products[i].category.name,
        priceAud: products[i].priceAud,
        imageUrl: products[i].imageUrls[0] ?? '',
      },
      quantity: line.quantity,
    })));
    return { lines, shipping, items, subtotalAud };
  }

  /**
   * Read the cart cookie.
   *
   * @param {import('express').Request} req - Incoming request.
   * @returns {Array<{id: number, quantity: number}>} The lines.
   */
  #lines(req) {
    return parseCart(req.cookies?.[CART_COOKIE]);
  }

  /**
   * Render the shipping step.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{values: Object, errors?: Object}} state - What to show.
   * @returns {void}
   */
  #renderShipping(res, { values, errors = {} }) {
    res.render('layouts/base', {
      title: 'Lpaecomms — Shipping',
      page: 'checkoutShipping',
      scripts: CHECKOUT_SCRIPTS,
      fields: SHIPPING_FIELDS,
      values,
      errors,
    });
  }

  /**
   * Render the payment step.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{shipping: Object, items: Array, subtotalAud: number, values: Object, errors?: Object}} state - What to show.
   * @returns {void}
   */
  #renderPayment(res, { shipping, items, subtotalAud, values, errors = {} }) {
    res.render('layouts/base', {
      title: 'Lpaecomms — Payment',
      page: 'checkoutPayment',
      scripts: CHECKOUT_SCRIPTS,
      fields: CARD_FIELDS,
      shipping,
      items,
      subtotalAud,
      values,
      errors,
    });
  }
}
