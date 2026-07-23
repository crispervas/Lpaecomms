/**
 * @file About controller.
 *
 * Handles the About page. Part of the view layer: it selects a template and
 * renders HTML. A static content page, so it needs no model.
 */

/**
 * Controller for the About page.
 */
export class AboutController {
  /**
   * Render the About page.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  index(req, res) {
    res.render('layouts/base', { title: 'Lpaecomms — About', page: 'about' });
  }
}
