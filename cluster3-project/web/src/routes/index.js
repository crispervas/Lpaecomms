/**
 * @file Route registration.
 *
 * Wires the two independent route groups onto the application: view routes that
 * render EJS templates (mounted at `/`) and API routes that return JSON
 * (mounted at `/api`). The two groups never depend on each other. Concrete
 * route modules are attached to these routers in their own slices.
 */

import express from 'express';
import homeRoutes from './views/home.routes.js';

/**
 * Mount the view and API routers on the application.
 *
 * @param {import('express').Express} app - The Express application to mount on.
 * @returns {void}
 */
export function registerRoutes(app) {
  const viewRouter = express.Router();
  const apiRouter = express.Router();

  // View routes (HTML).
  viewRouter.use('/', homeRoutes);

  app.use('/', viewRouter);
  app.use('/api', apiRouter);
}
