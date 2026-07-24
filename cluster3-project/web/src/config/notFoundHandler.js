/**
 * @file 404 (Not Found) handlers.
 *
 * Terminal middleware that runs after every route has had its chance to match.
 * Because the web layer and the API layer share one Express instance, an
 * unmatched request needs a predictable answer instead of Express's default
 * HTML page. Both handlers are mounted after `registerRoutes`, so reaching
 * either one means no view route and no API route claimed the request.
 */

import boom from "@hapi/boom";

/**
 * Answer an unmatched API request with a JSON 404.
 *
 * Meant for the REST clients (mobile, desktop), which expect a machine-readable
 * body rather than an HTML page.
 *
 * @param {import('express').Request} req - Incoming request; only `originalUrl` is read.
 * @param {import('express').Response} res - Response used to send the JSON body.
 * @returns {void}
 */
export const notFoundHandlerApi = (req, res) => {
    // Let cross-origin REST clients (mobile, desktop) read the 404 response.
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    // Reuse Boom's canonical 404 shape instead of hand-writing status and message.
    const {
        output: { statusCode, payload },
    } = boom.notFound();

    res.status(statusCode).json({
        ...payload,
        developer: "Cristhian Pereira",
        url: req.originalUrl, // Echo the path that failed to match, to aid debugging.
    });
};

/**
 * Answer an unmatched web (browser) request by rendering the 404 page.
 *
 * Serves the branded HTML error page (wrapped by the base layout) instead of
 * JSON, because this handler answers browser navigation rather than the REST
 * clients. No CORS headers here: the page is served same-origin to the browser.
 *
 * @param {import('express').Request} req - Incoming request; only `originalUrl` is read.
 * @param {import('express').Response} res - Response used to render the view.
 * @returns {void}
 */
export const notFoundHandlerWeb = (req, res) => {
    // Reuse Boom's canonical 404 status instead of a magic number.
    const {
        output: { statusCode },
    } = boom.notFound();

    // Render pages/404 through the shared layout so the page keeps the header,
    // footer, and Tailwind styles. `url` lets the view show the failed path.
    res.status(statusCode).render("layouts/base", {
        title: "Page not found — Lpaecomms",
        page: "404",
        url: req.originalUrl,
    });
};
