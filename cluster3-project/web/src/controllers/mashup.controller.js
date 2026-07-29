/**
 * @file Mashup controller.
 *
 * Handles the Mashups page. Part of the view layer: it selects a template and
 * renders HTML. It fetches no data — each mashup on the page requests what it
 * needs from the REST API in the browser, the same way the mobile and desktop
 * clients do, so there is one data path per mashup instead of two.
 */

/** Page title for the Mashups page. */
const PAGE_TITLE = 'Lpaecomms — Mashups';

/**
 * Front-end assets for the Mashups page. Leaflet is pinned and loaded from a
 * CDN; the mashup scripts are served from public/. Order matters — Leaflet must
 * load before the map script that uses it. Passed to the layout via the
 * `styles`/`scripts` locals so no other page downloads Leaflet.
 */
const MASHUP_STYLES = ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];
const MASHUP_SCRIPTS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  '/js/mashup-map.js',
];

/**
 * Controller for the Mashups page.
 */
export class MashupController {
  /**
   * Render the Mashups page shell.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  index(req, res) {
    res.render('layouts/base', {
      title: PAGE_TITLE,
      page: 'mashup',
      styles: MASHUP_STYLES,
      scripts: MASHUP_SCRIPTS,
    });
  }
}
