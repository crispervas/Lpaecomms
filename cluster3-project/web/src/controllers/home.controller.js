/**
 * @file Home controller.
 *
 * Handles the storefront home page. Part of the view layer: it reads the
 * request, selects a template, and renders HTML. It never builds database
 * queries — that is the model layer's responsibility.
 */

/**
 * Controller for the storefront home page.
 */
export class HomeController {
  /**
   * Render the home page.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  index(req, res) {
    res.render('layouts/base', { title: 'LPA Store — Home', page: 'home' });
  }
}
