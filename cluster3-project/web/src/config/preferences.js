/**
 * @file Appearance preferences middleware.
 *
 * Puts the visitor's validated appearance choices on `res.locals` so the layout
 * can write them into `<html>` before the first paint. Reading the preference on
 * the server rather than in a browser script is what keeps the page from
 * rendering in the default theme and then jumping to the chosen one.
 */

import { PREFERENCES_COOKIE, parsePreferences } from '../lib/preferences.js';

/**
 * Resolve the request's appearance preferences for every template.
 *
 * Never fails: an absent, stale or edited cookie resolves to the defaults, so a
 * bad cookie costs a visitor their theme rather than the page.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Passes control onward.
 * @returns {void}
 */
export function preferencesLocals(req, res, next) {
  res.locals.preferences = parsePreferences(req.cookies?.[PREFERENCES_COOKIE]);
  next();
}
