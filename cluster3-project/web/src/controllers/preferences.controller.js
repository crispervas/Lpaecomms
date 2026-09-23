/**
 * @file Preferences controller.
 *
 * Serves the appearance page and stores what a visitor chooses there. A view
 * controller: it renders HTML and sets a cookie, and never answers with JSON.
 *
 * The save has two callers with different needs. A form submission wants to
 * land back on the page it came from, so it gets a redirect. The header panel
 * has already applied the change in the browser and only needs to know the
 * write succeeded, so it gets a bare 204 — a body there would make this route
 * answer like the API, which the mobile and desktop clients own.
 */

import {
  PREFERENCES_COOKIE,
  isSafeReturnPath,
  serialisePreferences,
  validatePreferences,
} from '../lib/preferences.js';
import { persistentCookieOptions } from '../config/cookies.js';

/** Where a save returns to when the submitted path cannot be trusted. */
const FALLBACK_RETURN_PATH = '/preferences';

/**
 * Controller for the appearance preferences page.
 */
export class PreferencesController {
  /**
   * Render the page.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  show(req, res) {
    this.#render(res, { returnTo: FALLBACK_RETURN_PATH });
  }

  /**
   * Validate a submission and store it.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  save(req, res) {
    // `req.body` is `undefined`, not `{}`, when the request arrives in an
    // encoding neither express.json() nor express.urlencoded() parses (e.g.
    // multipart) — there is no parser installed for that on purpose, so this
    // request must degrade into the same 422 a bad field value already gets,
    // not throw. `?? {}` reduces it to that existing case: every field below
    // reads as missing, which validatePreferences already rejects.
    const { theme, text, returnTo } = req.body ?? {};
    const errors = validatePreferences({ theme, text });

    // Resolved before the branch so the error render returns the visitor to the
    // same place a success would have.
    const destination = isSafeReturnPath(returnTo) ? returnTo : FALLBACK_RETURN_PATH;

    if (Object.keys(errors).length > 0) {
      // 422 rather than 400: the body parsed fine, it just named something that
      // does not exist.
      res.status(422);
      this.#render(res, { errors, returnTo: destination });
      return;
    }

    res.cookie(
      PREFERENCES_COOKIE,
      serialisePreferences({ theme, textSize: text }),
      persistentCookieOptions(),
    );

    if (req.get('X-Requested-With')) {
      res.status(204).end();
      return;
    }

    // 303 rather than 302: the response to a POST is a page to GET, and saying
    // so stops a reload from re-submitting.
    res.redirect(303, destination);
  }

  /**
   * Render the page with a full set of locals.
   *
   * The current selection is not passed here: it comes from `res.locals`, which
   * the preferences middleware already resolved from the cookie. One source for
   * what is selected means the form and the `<html>` attributes cannot disagree.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{errors?: Record<string, string>, returnTo: string}} state - What to show.
   * @returns {void}
   */
  #render(res, { errors = {}, returnTo }) {
    res.render('layouts/base', {
      title: 'Lpaecomms — Appearance',
      page: 'preferences',
      errors,
      returnTo,
    });
  }
}
