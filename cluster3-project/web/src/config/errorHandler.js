/**
 * @file Error-handling middleware chain.
 *
 * Express distinguishes error middleware by its four-argument signature
 * `(err, req, res, next)`. These run, in order, only once something upstream
 * calls `next(err)`:
 *   1. `logErrors`  — record the error on the server, in every environment.
 *   2. `wrapErrors` — guarantee every error is a Boom object.
 *   3. `errorHandler` — send the final response, JSON or HTML by client.
 * The order matters: `errorHandler` assumes it always receives a Boom error,
 * which is exactly what `wrapErrors` guarantees just before it.
 *
 * Because the web layer and the API layer share one Express instance, the
 * terminal handler branches the same way `notFoundHandler` does: REST clients
 * (mobile, desktop) get JSON, browsers get the rendered error page.
 */

import boom from "@hapi/boom";

/**
 * Whether the process is running in production.
 *
 * Production hides internals from the *client*; it never hides them from the
 * server logs. Keeping the two decisions separate is the point of this helper.
 *
 * @returns {boolean} True when `NODE_ENV` is `production`.
 */
const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Decide which client is waiting on this response.
 *
 * Path-based rather than content negotiation: it mirrors the `/api` mount point
 * and stays deterministic, whereas `fetch` commonly sends a wildcard `Accept`
 * header and would be misread as a browser.
 *
 * @param {import('express').Request} req - Incoming request; `originalUrl` is read.
 * @returns {boolean} True when the request targets the REST API.
 */
const isApiRequest = (req) => req.originalUrl.startsWith("/api");

/**
 * Flatten validation details into a list of messages.
 *
 * Accepts either Joi's `errors` array or custom validators that attach details
 * under `err.data.details`.
 *
 * @param {import('@hapi/boom').Boom} err - The Boom error being rendered.
 * @returns {Array<{message: string}>} Normalized messages, empty when none apply.
 */
const collectValidation = (err) => {
    if (err.errors) return err.errors.map((e) => ({ message: `${e.path} ${e.message}` }));
    if (err.data?.details) return err.data.details.map((d) => ({ message: `${d}` }));
    return [];
};

/**
 * Log the error to the server console.
 *
 * Runs in every environment: production is where an unrecorded failure costs
 * most, and what varies per environment is what the client is shown, not what
 * the server records. Passes the error along untouched — this middleware only
 * observes.
 *
 * @param {Error} err - The error forwarded via `next(err)`.
 * @param {import('express').Request} req - Read for `originalUrl` and `method`.
 * @param {import('express').Response} res - Unused.
 * @param {import('express').NextFunction} next - Forwards the same error.
 * @returns {void}
 */
export const logErrors = (err, req, res, next) => {
    console.error("🪵 Captured error:", {
        message: err.message,
        status: err.output?.statusCode ?? 500,
        method: req.method,
        url: req.originalUrl,
        stack: err.stack,
        // Some callers attach upstream detail as data instead of merging it into
        // the message (see product.controller.js), precisely so it stays out of
        // the client response. Logging it here is what keeps that detail from
        // being lost rather than just hidden.
        data: err.data,
    });

    next(err);
};

/**
 * Normalize any error into a Boom error before it reaches `errorHandler`.
 *
 * Non-Boom errors (thrown strings, native `Error`s, third-party failures) are
 * wrapped as a 500 so the final handler can rely on `err.output` always existing.
 * CORS headers are not this middleware's job: `apiCorsHeaders` (config/apiCors.js)
 * sets them ahead of the routes for every `/api` response, success or failure,
 * so they do not need to be repeated on the error path here.
 *
 * @param {Error} err - The forwarded error.
 * @param {import('express').Request} req - Unused; kept for the four-argument
 *   error-middleware signature Express requires.
 * @param {import('express').Response} res - Unused for the same reason.
 * @param {import('express').NextFunction} next - Forwards a guaranteed-Boom error.
 * @returns {void}
 */
export const wrapErrors = (err, req, res, next) => {
    // Anything that isn't already Boom becomes a 500 so downstream code stays uniform.
    if (!err.isBoom) return next(boom.badImplementation(err));
    next(err);
};

/**
 * Answer a failed API request with JSON.
 *
 * @param {import('@hapi/boom').Boom} err - The Boom error to render.
 * @param {import('express').Request} req - Read for `originalUrl` and `method`.
 * @param {import('express').Response} res - Used to send the JSON body.
 * @returns {void}
 */
const errorHandlerApi = (err, req, res) => {
    const {
        output: { statusCode, payload },
    } = err;

    const body = {
        ...payload,
        validation: collectValidation(err),
        url: req.originalUrl,
        method: req.method,
    };

    // Stack traces stay server-side in production; they leak internals otherwise.
    if (!isProduction()) body.stack = err.stack;

    res.status(statusCode).json(body);
};

/**
 * Answer a failed browser request by rendering the error page.
 *
 * Uses `res.render`'s callback form so the response is only sent once the page
 * has compiled: if the error page itself fails, the fallback is plain text
 * rather than a second render, which would recurse.
 *
 * @param {import('@hapi/boom').Boom} err - The Boom error to render.
 * @param {import('express').Request} req - Read for `originalUrl`.
 * @param {import('express').Response} res - Used to render the view.
 * @returns {void}
 */
const errorHandlerWeb = (err, req, res) => {
    const {
        output: { statusCode },
    } = err;

    res.status(statusCode).render(
        "layouts/base",
        {
            title: "Something went wrong — Lpaecomms",
            page: "error",
            status: statusCode,
            url: req.originalUrl,
            // The shared header reads `currentPath`. Normally res.locals carries
            // it, but an error raised before that middleware would leave it
            // undefined and break the error page itself.
            currentPath: res.locals.currentPath ?? req.path,
            // Outside production the message shortens the debugging loop; in
            // production the page stays generic.
            detail: isProduction() ? null : err.message,
        },
        (renderError, html) => {
            if (renderError) {
                console.error("🪵 Error page failed to render:", renderError);
                return res.type("text/plain").send(`Error ${statusCode}`);
            }

            res.send(html);
        },
    );
};

/**
 * Final error middleware: pick the response format and send it.
 *
 * Relies on the error already being Boom (see `wrapErrors`), so `output` and
 * its `statusCode`/`payload` are always present.
 *
 * @param {import('@hapi/boom').Boom} err - The Boom error to render.
 * @param {import('express').Request} req - Read to choose the client format.
 * @param {import('express').Response} res - Used to send the response.
 * @param {import('express').NextFunction} next - Delegates to Express's default
 *   handler when the response has already started streaming.
 * @returns {void}
 */
export const errorHandler = (err, req, res, next) => {
    // A response already started streaming (e.g. a broken include partway
    // through a render). Express's default handler is the only thing that can
    // close it safely; writing more would throw ERR_HTTP_HEADERS_SENT.
    if (res.headersSent) return next(err);

    return isApiRequest(req) ? errorHandlerApi(err, req, res) : errorHandlerWeb(err, req, res);
};
