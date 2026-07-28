/**
 * @file Mashup controller.
 *
 * Handles the Mashups page. Part of the view layer: it selects a template and
 * renders HTML. This is the landing page for the mashups (content combined from
 * more than one external source); the integrations themselves are added later,
 * so for now it needs no model.
 */

/** Page title reused by both branches. */
const PAGE_TITLE = 'Lpaecomms — Mashups';

/** External catalogue feeding the first mashup preview. */
/** const PRODUCTS_SOURCE = 'https://api.escuelajs.co/api/v1/products?limit=1&offset=1';*/
const PRODUCTS_SOURCE = 'https://api.escuelajs.co/api/v1/categories/2/products?limit=5&offset=1';

/**
 * Controller for the Mashups page.
 */
export class MashupController {

  /**
   * Render the Mashups page.
   *
   * The page degrades instead of failing: an unreachable external source still
   * renders the layout, with a notice in place of the data. The failure is
   * therefore logged here rather than forwarded to `next`, because the error
   * middleware would try to send a second response for the same request.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>} Resolves once the page has been rendered.
   */
  async index(req, res) {
    try {
      const response = await fetch(PRODUCTS_SOURCE);

      // fetch only rejects on network failure: a 4xx/5xx arrives as a resolved
      // response, so without this check an error body would render as products.
      if (!response.ok) {
        throw new Error(`Product source responded ${response.status}`);
      }

      const products = await response.json();

      res.render('layouts/base', {
        title: PAGE_TITLE,
        page: 'mashup',
        products,
        selected: null,
        errors: {},
      });
    } catch (error) {
      
      console.error('Mashup source unavailable:', {
        message: error.message,
        source: PRODUCTS_SOURCE,
        url: req.originalUrl,
        stack: error.stack,
      });

      res.render('layouts/base', {
        title: PAGE_TITLE,
        page: 'mashup',
        products: null,
        selected: {},
        errors: { fetch: 'Live product data is unavailable right now.' },
      });
    }
  }


}
