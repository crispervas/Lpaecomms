/**
 * @file Error-handling middleware chain.
 *
 * Express distinguishes error middleware by its four-argument signature
 * `(err, req, res, next)`. These run, in order, only once something upstream
 * calls `next(err)`:
 *   1. `logErrors`  — record the error (development only).
 *   2. `wrapErrors` — guarantee every error is a Boom object.
 *   3. `errorHandler` — build and send the final JSON response.
 * The order matters: `errorHandler` assumes it always receives a Boom error,
 * which is exactly what `wrapErrors` guarantees just before it.
 */

import boom from "@hapi/boom";

/**
 * Shape the payload that goes back to the client.
 *
 * A development-oriented object (with stack trace, validation detail, url and
 * method) is assembled but intentionally not returned: the trimmed production
 * shape is sent in every environment so internals are never leaked. Swap the
 * returned value to expose more detail while debugging.
 *
 * @param {object} error - Boom `output.payload` (status, error, message).
 * @param {string} stack - The original error's stack trace.
 * @param {Array<{message: string}>} validation - Normalized validation messages.
 * @param {string} url - The requested URL (`req.originalUrl`).
 * @param {string} method - The HTTP method used.
 * @returns {object} The production-safe error payload.
 */
const withErrorStack = (error, stack, validation, url, method) => {
    // Verbose variant, useful during debugging but withheld from clients.
    const baseErrorDev = {
        ...error,
        stack,
        validation,
        url,
        method,
    };

    return baseErrorDev;
};

/**
 * Log the error to the server console outside production.
 *
 * Passes the error along untouched so later middleware can still handle it;
 * this middleware only observes.
 *
 * @param {Error} err - The error forwarded via `next(err)`.
 * @param {import('express').Request} req - Unused.
 * @param {import('express').Response} res - Unused.
 * @param {import('express').NextFunction} next - Forwards the same error.
 * @returns {void}
 */
export const logErrors = (err, req, res, next) => {
    // Keep stack traces out of production logs; they are noise there and can leak internals.
    if (process.env.NODE_ENV !== "production") console.error("🪵 Captured error:", err);
    next(err);
};

/**
 * Normalize any error into a Boom error before it reaches `errorHandler`.
 *
 * Non-Boom errors (thrown strings, native `Error`s, third-party failures) are
 * wrapped as a 500 so the final handler can rely on `err.output` always existing.
 *
 * @param {Error} err - The forwarded error.
 * @param {import('express').Request} req - Unused.
 * @param {import('express').Response} res - Used to set CORS headers.
 * @param {import('express').NextFunction} next - Forwards a guaranteed-Boom error.
 * @returns {void}
 */
export const wrapErrors = (err, req, res, next) => {
    // Set CORS here too, so error responses are readable by cross-origin clients.
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    // Anything that isn't already Boom becomes a 500 so downstream code stays uniform.
    if (!err.isBoom) return next(boom.badImplementation(err));
    next(err);
};

/**
 * Final error middleware: build the JSON body and send the response.
 *
 * Relies on the error already being Boom (see `wrapErrors`), so `output` and
 * its `statusCode`/`payload` are always present.
 *
 * @param {import('@hapi/boom').Boom} err - The Boom error to render.
 * @param {import('express').Request} req - Used for `originalUrl` and `method`.
 * @param {import('express').Response} res - Used to send the response.
 * @param {import('express').NextFunction} next - Unused; this is the terminal handler.
 * @returns {void}
 */
export const errorHandler = (err, req, res, next) => {
    const {
        output: { statusCode, payload },
        errors,
    } = err;

    // Collect a flat list of validation messages from either Joi (`errors`)
    // or custom validators that attach details under `err.data.details`.
    let validation = [];

    if (errors) {
        validation = errors.map((e) => ({ message: `${e.path} ${e.message}` }));
    } else if (err.data?.details) {
        validation = err.data.details.map((d) => ({ message: `${d}` }));
    }

    res.status(statusCode);

    const response = withErrorStack(payload, err.stack, validation, req.originalUrl, req.method);

    res.json(response);
};
