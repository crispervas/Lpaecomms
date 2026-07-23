/**
 * @file Route registration.
 *
 * Wires the two independent route groups onto the application: view routes that
 * render EJS templates (mounted at `/`) and API routes that return JSON
 * (mounted at `/api`). The two groups never depend on each other. Concrete
 * route modules are attached to these routers in their own slices.
 */

import express from 'express';

/**
 * Mount the view and API routers on the application.
 *
 * @param {import('express').Express} app - The Express application to mount on.
 * @returns {void}
 */
export function registerRoutes(app) {
  const viewRouter = express.Router();
  const apiRouter = express.Router();

  // Route modules (home page, health check, ...) are attached here per slice.

  app.use('/', viewRouter);
  app.use('/api', apiRouter);
}
