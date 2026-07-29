/**
 * @file Express application factory.
 *
 * Builds and configures the Express application — view engine, static assets,
 * body parsers, and route mounting — but does not start listening. Keeping the
 * app factory separate from the server entry point lets tests exercise routes
 * with supertest without binding a TCP port.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerRoutes } from './routes/index.js';
import { notFoundHandlerApi, notFoundHandlerWeb } from './config/notFoundHandler.js';
import { errorHandler, logErrors, wrapErrors } from './config/errorHandler.js';
import { apiCorsHeaders } from './config/apiCors.js';

/** Absolute path to the `src` directory, resolved from this module. */
const srcDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create a fully configured Express application.
 *
 * @returns {import('express').Express} The configured app, not yet listening.
 */
export function createApp() {
  const app = express();

  // Server-rendered views live under src/views and are rendered with EJS.
  app.set('view engine', 'ejs');
  app.set('views', path.join(srcDir, 'views'));

  // Static assets, including the compiled Tailwind stylesheet, live in src/public.
  app.use(express.static(path.join(srcDir, 'public')));

  // Parse JSON and URL-encoded form bodies for both view and API routes.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Expose the current path to every view so the navigation can mark the
  // active link without each controller having to pass it.
  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
  });

  // CORS headers apply to every /api response — success, failure, and the
  // API's own 404 alike — so this must be mounted ahead of both the routes
  // and notFoundHandlerApi below, not folded into either one. View routes are
  // served same-origin to the browser and carry no CORS header.
  app.use('/api', apiCorsHeaders);

  // Mount view routes (HTML) and API routes (JSON).
  registerRoutes(app);

  // Catch-all for unmatched requests, split by client:
  //   /api/*  -> JSON 404 for the REST clients (mobile, desktop).
  //   others  -> HTML 404 page for browser navigation.
  // Both run after every route, so reaching them means nothing matched, and
  // before the error middleware so a 404 is a normal response, not an error.
  app.use('/api', notFoundHandlerApi);
  app.use(notFoundHandlerWeb);

  // Error-handling chain. Order is significant and must not change:
  //   logErrors   — record the error, in every environment, then re-throw it.
  //   wrapErrors  — turn any non-Boom error into a Boom error.
  //   errorHandler — build and send the final response, JSON or HTML by client.
  // Each only runs once something upstream calls next(err); errorHandler relies
  // on wrapErrors having already guaranteed a Boom-shaped error.
  app.use(logErrors);
  app.use(wrapErrors);
  app.use(errorHandler);

  return app;
}
