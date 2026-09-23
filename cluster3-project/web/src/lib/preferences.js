/**
 * @file Appearance preference rules.
 *
 * The single source of truth for which themes and text sizes exist, how they
 * travel in a cookie, and what counts as a safe place to send a visitor after
 * they save. Deliberately free of Express: the whitelist here guards a value
 * that ends up inside an HTML attribute, and that is worth testing exhaustively
 * without a request in the way.
 *
 * Two entry points read a preference and they forgive different things.
 * `parsePreferences` reads a cookie, which anyone can edit and which may be
 * years old, so it never fails — it falls back. `validatePreferences` reads a
 * form submission, which is a deliberate act, so it reports what did not make
 * sense.
 */

/** Name of the cookie carrying a visitor's appearance choices. */
export const PREFERENCES_COOKIE = 'lpa_prefs';

/**
 * Themes the stylesheet defines. Must match the `html[data-theme="..."]` blocks
 * in styles/less/abstracts/_themes.less exactly; `daylight` is the palette
 * :root publishes and therefore has no block of its own.
 * @type {readonly string[]}
 */
export const THEMES = Object.freeze(['daylight', 'midnight', 'forest', 'contrast']);

/**
 * Text sizes the stylesheet defines. Must match the
 * `html[data-text-size="..."]` rules in styles/less/base/_typography.less.
 * @type {readonly string[]}
 */
export const TEXT_SIZES = Object.freeze(['normal', 'large', 'larger']);

/**
 * What a visitor sees before they choose anything: the palette and the type
 * size the site has always shipped.
 * @type {Readonly<{theme: string, textSize: string}>}
 */
export const DEFAULT_PREFERENCES = Object.freeze({ theme: 'daylight', textSize: 'normal' });

/**
 * Read a preferences cookie, falling back for anything unrecognised.
 *
 * URL-encoded rather than JSON so a corrupted value cannot throw: there is no
 * parse step that can fail, only lookups that miss. A visitor whose cookie was
 * mangled gets the default appearance, not an error page.
 *
 * @param {string|undefined} raw - Raw cookie value, or undefined when unset.
 * @returns {{theme: string, textSize: string}} Always a usable pair.
 */
export function parsePreferences(raw) {
  const params = new URLSearchParams(typeof raw === 'string' ? raw : '');
  const theme = params.get('theme');
  const textSize = params.get('text');

  return {
    theme: THEMES.includes(theme) ? theme : DEFAULT_PREFERENCES.theme,
    textSize: TEXT_SIZES.includes(textSize) ? textSize : DEFAULT_PREFERENCES.textSize,
  };
}

/**
 * Render a preference pair as a cookie value.
 *
 * @param {{theme: string, textSize: string}} preferences - The pair to store.
 * @returns {string} A value `parsePreferences` reads back unchanged.
 */
export function serialisePreferences({ theme, textSize }) {
  return new URLSearchParams({ theme, text: textSize }).toString();
}

/**
 * Check a submitted preference pair.
 *
 * @param {{theme?: unknown, text?: unknown}} [submission] - Raw form body fields.
 * @returns {Record<string, string>} Field name to message; empty when valid.
 */
export function validatePreferences({ theme, text } = {}) {
  const errors = {};

  if (!THEMES.includes(theme)) {
    errors.theme = 'Choose one of the available themes.';
  }

  if (!TEXT_SIZES.includes(text)) {
    errors.textSize = 'Choose one of the available text sizes.';
  }

  return errors;
}

/**
 * Decide whether a value may be used as a redirect target.
 *
 * The preferences form carries the page it was opened from so saving returns
 * the visitor where they were. That field arrives from the client like any
 * other, and handing it to `res.redirect` unchecked is an open redirect — a
 * link to /preferences that quietly lands on someone else's site.
 *
 * @param {unknown} value - Candidate path from the request body.
 * @returns {boolean} True when the value can only address this site.
 */
export function isSafeReturnPath(value) {
  if (typeof value !== 'string' || value === '') return false;

  // Must be site-relative. A leading "//" or "/" followed by a backslash is a
  // protocol-relative URL, which browsers resolve against another origin
  // despite the leading slash.
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/' + String.fromCharCode(92))) return false;

  // A control character — a line break above all — could split the Location
  // header and append one the server never wrote.
  if (/[\p{Cc}]/u.test(value)) return false;

  return true;
}
