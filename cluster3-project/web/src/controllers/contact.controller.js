/**
 * @file Contact controller.
 *
 * Handles the Contact page: it shows the form and processes submissions with
 * server-side validation. On success it confirms receipt without sending an
 * email yet — email delivery is a separate integration.
 */

/** Basic email shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Page title reused by both actions. */
const PAGE_TITLE = 'Lpaecomms — Contact us';

/**
 * Front-end assets for the Contact page map. Leaflet is pinned and loaded from
 * a CDN; the init script is served from public/. Order matters — Leaflet must
 * load before the init script that uses it. Passed to the layout via the
 * `styles`/`scripts` locals.
 */
const MAP_STYLES = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];
const MAP_SCRIPTS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  '/js/contact-map.js',
];

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
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'contact',
      styles: MAP_STYLES,
      scripts: MAP_SCRIPTS,
      errors: {},
      values: { name: '', email: '', message: '' },
      success: false,
    });
  }

  /**
   * Validate and process a contact submission. Re-renders the form with errors
   * and the submitted values when invalid (HTTP 422), or a confirmation when
   * valid.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  submit(req, res) {
    const values = {
      name: (req.body.name ?? '').trim(),
      email: (req.body.email ?? '').trim(),
      message: (req.body.message ?? '').trim(),
    };
    const errors = this.#validate(values);

    if (Object.keys(errors).length > 0) {
      res.status(422).render('layouts/base', {
        title: PAGE_TITLE,
        page: 'contact',
      styles: MAP_STYLES,
      scripts: MAP_SCRIPTS,
        errors,
        values,
        success: false,
      });
      return;
    }

    // No email is sent yet; delivery is a separate integration. Confirm receipt
    // and clear the form.
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'contact',
      styles: MAP_STYLES,
      scripts: MAP_SCRIPTS,
      errors: {},
      values: { name: '', email: '', message: '' },
      success: true,
    });
  }

  /**
   * Validate submitted contact values.
   *
   * @param {{ name: string, email: string, message: string }} values - Trimmed input.
   * @returns {Record<string, string>} Map of field name to error message; empty when valid.
   */
  #validate(values) {
    const errors = {};
    if (!values.name) {
      errors.name = 'Please enter your name.';
    }
    if (!values.email) {
      errors.email = 'Please enter your email.';
    } else if (!EMAIL_PATTERN.test(values.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!values.message) {
      errors.message = 'Please enter a message.';
    }
    return errors;
  }
}
