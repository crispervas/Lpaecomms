/**
 * @file CORS headers for the REST API.
 *
 * The mobile (Ionic) and desktop (Electron) clients are cross-origin callers
 * of this API — Ionic's dev server runs on its own localhost port — so every
 * `/api` response needs the CORS headers, not only the failed ones. This used
 * to be handled inside `wrapErrors` (see errorHandler.js), which only runs on
 * the error path; a successful response carried no CORS header at all, so a
 * cross-origin client could read this API's failures but not its data. Mounted
 * ahead of the API routes in app.js, this middleware sets the same headers on
 * every `/api` request regardless of how it is ultimately answered.
 */

/**
 * Set the CORS headers every `/api` response carries.
 *
 * Wildcard origin, no credentials: this API is public and unauthenticated
 * today, so an allow-list or a credentials policy would be a decision nobody
 * has made yet, not a gap to close here.
 *
 * @param {import('express').Request} req - Incoming request; an OPTIONS
 *   preflight is answered here. The headers themselves do not depend on it.
 * @param {import('express').Response} res - Response the headers are set on.
 * @param {import('express').NextFunction} next - Passes control to the next
 *   middleware or route handler.
 * @returns {void}
 */
export const apiCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // A cross-origin POST with a JSON body is preceded by an OPTIONS preflight.
  // No route answers OPTIONS, so without this it would fall through to the
  // API 404 handler and the browser would never send the real request.
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
};
