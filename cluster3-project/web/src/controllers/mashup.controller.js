/**
 * @file Mashup controller.
 *
 * Handles the Mashups page. Part of the view layer: it selects a template and
 * renders HTML. This is the landing page for the mashups (content combined from
 * more than one external source); the integrations themselves are added later,
 * so for now it needs no model.
 */

/**
 * Controller for the Mashups page.
 */
export class MashupController {
  /**
   * Render the Mashups page.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  index(req, res) {
    res.render('layouts/base', { title: 'Lpaecomms — Mashups', page: 'mashup' });
  }
}
