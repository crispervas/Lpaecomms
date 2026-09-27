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
import catalogRoutes from './views/catalog.routes.js';
import productDetailRoutes from './views/productDetail.routes.js';
import aboutRoutes from './views/about.routes.js';
import contactRoutes from './views/contact.routes.js';
import authRoutes from './views/auth.routes.js';
import accountRoutes from './views/account.routes.js';
import cartRoutes from './views/cart.routes.js';
import mashupRoutes from './views/mashup.routes.js';
import preferencesRoutes from './views/preferences.routes.js';
import { buildHealthRouter } from './api/health.routes.js';
import currencyRoutes from './api/currency.routes.js';
import passwordRoutes from './api/password.routes.js';
import contactApiRoutes from './api/contact.routes.js';
import { requestTime } from '../middlewares/requestTime.js';
import { buildCrudRouter } from './api/crud.routes.js';
import { resources } from '../resources/index.js';

/**
 * Mount the view and API routers on the application.
 *
 * @param {import('express').Express} app - The Express application to mount on.
 * @param {Object} deps - Injected dependencies.
 * @param {import('@prisma/client').PrismaClient} deps.prisma - Client for the API routers.
 * @returns {void}
 */
export function registerRoutes(app, { prisma }) {
  const viewRouter = express.Router();
  const apiRouter = express.Router();

  // View routes (HTML).
  viewRouter.use('/', homeRoutes);
  viewRouter.use('/', catalogRoutes);
  viewRouter.use('/', productDetailRoutes);
  viewRouter.use('/', aboutRoutes);
  viewRouter.use('/', contactRoutes);
  viewRouter.use('/', authRoutes);
  viewRouter.use('/', accountRoutes);
  viewRouter.use('/', cartRoutes);
  viewRouter.use('/', preferencesRoutes);
  viewRouter.use('/', mashupRoutes);

  // API routes (JSON).
  apiRouter.use('/', buildHealthRouter(prisma));
  // One router per CRUD resource; see src/resources/.
  for (const resource of resources) apiRouter.use('/', buildCrudRouter(resource, prisma));
  apiRouter.use('/', contactApiRoutes);
  apiRouter.use('/', currencyRoutes);
  apiRouter.use('/', passwordRoutes);

  app.use('/', viewRouter);
  // Fixes the request's arrival time for the audit stamps. Mounted after the
  // body parsers (app.js) so it can read the client's optional `time` field.
  app.use('/api', requestTime);
  app.use('/api/v1', apiRouter);
}
