/**
 * @file Health check API routes.
 *
 * Maps the health check URL to the health controller. This is an API route: it
 * returns JSON and must never depend on a view route. Built by a factory so the
 * Prisma client is injected — the app's singleton in production, a fake in tests.
 */

import express from 'express';
import { HealthModel } from '../../models/health.model.js';
import { HealthController } from '../../controllers/health.controller.js';

/**
 * Build the health router.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - Client the health model pings.
 * @returns {import('express').Router} Router with GET /health.
 */
export function buildHealthRouter(prisma) {
  const router = express.Router();
  const healthController = new HealthController(new HealthModel(prisma));

  // GET /api/v1/health -> report service and database health.
  router.get('/health', (req, res) => healthController.check(req, res));

  return router;
}
