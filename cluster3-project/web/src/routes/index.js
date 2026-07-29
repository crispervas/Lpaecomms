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
import aboutRoutes from './views/about.routes.js';
import contactRoutes from './views/contact.routes.js';
import authRoutes from './views/auth.routes.js';
import mashupRoutes from './views/mashup.routes.js';
import healthRoutes from './api/health.routes.js';
import productRoutes from './api/product.routes.js';
import currencyRoutes from './api/currency.routes.js';
import passwordRoutes from './api/password.routes.js';

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
  viewRouter.use('/', aboutRoutes);
  viewRouter.use('/', contactRoutes);
  viewRouter.use('/', authRoutes);
  viewRouter.use('/', mashupRoutes);

  // API routes (JSON).
  apiRouter.use('/', healthRoutes);
  apiRouter.use('/', productRoutes);
  apiRouter.use('/', currencyRoutes);
  apiRouter.use('/', passwordRoutes);

  app.use('/', viewRouter);
  app.use('/api/v1', apiRouter);
}
