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

  // Mount view routes (HTML) and API routes (JSON).
  registerRoutes(app);

  return app;
}
