/**
 * @file Auth controller.
 *
 * Serves the login page. Authentication itself — user model, password hashing,
 * and sessions — is a separate slice. For now the POST handler acknowledges the
 * submission without signing anyone in, so the page is fully navigable while the
 * backend is built later.
 */

/** Page title reused by both actions. */
const PAGE_TITLE = 'Lpaecomms — Log in';

/**
 * Controller for the login page.
 */
export class AuthController {
  /**
   * Render the empty login form.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  showLogin(req, res) {
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'login',
      notice: null,
      values: { email: '' },
    });
  }

  /**
   * Acknowledge a login submission. Authentication is not implemented yet, so
   * this re-renders the page with an informational notice instead of signing in.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  login(req, res) {
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'login',
      notice: 'Authentication is not available yet. This is a preview of the login page.',
      values: { email: (req.body.email ?? '').trim() },
    });
  }
}
