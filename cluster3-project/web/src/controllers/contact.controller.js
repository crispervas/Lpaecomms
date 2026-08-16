/**
 * @file Contact controller.
 *
 * Handles the Contact page: it shows the form and processes submissions. The
 * rules themselves live in lib/contactValidation.js, shared with the template
 * and — through the data attributes the template renders — with the browser
 * script, so all three describe the same form.
 *
 * This validation runs whatever happened in the browser. `contact-form.js`
 * catches the same mistakes sooner and more pleasantly, but it is a convenience
 * for people using a browser, not a gate: a POST can arrive from anywhere.
 *
 * On success it confirms receipt without sending an email yet — delivery is a
 * separate integration.
 */

import {
  CONTACT_FIELDS,
  normaliseContact,
  validateContact,
} from '../lib/contactValidation.js';

/** Page title reused by every action. */
const PAGE_TITLE = 'Lpaecomms — Contact us';

/**
 * Front-end assets for the Contact page. Leaflet is pinned and loaded from a
 * CDN; the init scripts are served from public/. Order matters — Leaflet must
 * load before the map script that uses it. `contact-form.js` depends on
 * neither. Passed to the layout via the `styles`/`scripts` locals so no other
 * page downloads Leaflet.
 */
const CONTACT_STYLES = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];
const CONTACT_SCRIPTS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  '/js/contact-map.js',
  '/js/contact-form.js',
];

/** An untouched form. */
const EMPTY_VALUES = { name: '', email: '', orderNumber: '', message: '' };

/**
 * Controller for the Contact page.
 */
export class ContactController {
  /**
   * Render the empty contact form.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  show(req, res) {
    this.#render(res, { values: EMPTY_VALUES });
  }

  /**
   * Validate and process a contact submission. Re-renders the form with the
   * errors and the submitted values when invalid (HTTP 422), or a confirmation
   * when valid.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  submit(req, res) {
    const values = normaliseContact(req.body);
    const errors = validateContact(values);

    if (Object.keys(errors).length > 0) {
      // 422 rather than 400: the body parsed fine, it just failed the rules.
      res.status(422);
      this.#render(res, { values, errors });
      return;
    }

    // No email is sent yet; delivery is a separate integration. Confirm receipt
    // and clear the form — re-offering the sent message invites sending it
    // twice.
    this.#render(res, { values: EMPTY_VALUES, success: true });
  }

  /**
   * Render the Contact page with a full set of locals.
   *
   * Every action renders the same template with the same shape, and a missing
   * local is a template crash rather than a quiet omission, so the defaults are
   * filled in here instead of at each call site.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{ values: object, errors?: object, success?: boolean }} state - What to show.
   * @returns {void}
   */
  #render(res, { values, errors = {}, success = false }) {
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'contact',
      styles: CONTACT_STYLES,
      scripts: CONTACT_SCRIPTS,
      fields: CONTACT_FIELDS,
      values,
      errors,
      success,
    });
  }
}
