/**
 * @file Auth controller.
 *
 * Serves the login page, which carries two modes on one URL: logging in and
 * signing up. `?tab=signup` selects the second, and a hidden `mode` field
 * carries the choice through a submission so a rejected sign-up comes back on
 * the sign-up tab with its fields intact.
 *
 * **Authentication itself does not exist.** There is no user model, no password
 * hashing and no session; the POST handler validates the shape of a submission
 * and nothing more. A well-formed log in opens the Account preview, as the
 * mobile app's does, so the page behind a sign-in can be reached and built; a
 * well-formed sign-up says plainly that no account can be created. Neither
 * signs anyone in.
 */

import {
  AUTH_FIELDS,
  normaliseAuth,
  resolveMode,
  validateAuth,
} from '../lib/authValidation.js';

/** Page titles, one per mode. */
const PAGE_TITLES = {
  login: 'Lpaecomms — Log in',
  signup: 'Lpaecomms — Create your account',
};

/** Shown on any well-formed submission, because none of them can succeed. */
const NO_AUTH_NOTICE =
  'Authentication is not available yet. This is a preview of the sign-in experience.';

/** The form's own script; the page needs no third-party asset. */
const AUTH_SCRIPTS = ['/js/form-validation.js'];

/**
 * Controller for the login page.
 */
export class AuthController {
  /**
   * Render the page in whichever mode the query asks for.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  showLogin(req, res) {
    this.#render(res, { mode: resolveMode(req.query.tab) });
  }

  /**
   * Validate a submission, then open the Account preview or report that it
   * cannot be completed.
   *
   * A malformed submission answers 422 with the errors. A well-formed log in
   * redirects to /account; a well-formed sign-up answers 200 with the notice.
   * Neither signs anybody in.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  login(req, res) {
    // `mode` arrives from the client like every other field, so it is resolved
    // through the same whitelist as the query string rather than trusted.
    const mode = resolveMode(req.body.mode);
    const values = normaliseAuth(mode, req.body);
    const errors = validateAuth(mode, values);

    if (Object.keys(errors).length > 0) {
      // 422 rather than 400: the body parsed fine, it just failed the rules.
      res.status(422);
      this.#render(res, { mode, values, errors });
      return;
    }

    if (mode === 'login') {
      // 303 so the browser follows with a GET: a refresh of /account must not
      // offer to resubmit the password.
      res.redirect(303, '/account');
      return;
    }

    this.#render(res, { mode, values, notice: NO_AUTH_NOTICE });
  }

  /**
   * Render the login page with a full set of locals.
   *
   * The password is dropped on the way out, whatever the caller passed. Putting
   * it back in the markup would write it into the browser cache, any proxy log
   * along the way, and view-source — for a field the reader can simply retype.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{ mode: 'login'|'signup', values?: object, errors?: object, notice?: string|null }} state - What to show.
   * @returns {void}
   */
  #render(res, { mode, values = {}, errors = {}, notice = null }) {
    res.render('layouts/base', {
      title: PAGE_TITLES[mode],
      page: 'login',
      // The split screen runs edge to edge, so this page skips the shared
      // container the other pages sit in.
      bleed: true,
      scripts: AUTH_SCRIPTS,
      mode,
      fields: AUTH_FIELDS[mode],
      values: { ...values, password: '' },
      errors,
      notice,
    });
  }
}
