/**
 * @file Health check API routes.
 *
 * Maps the health check URL to the health controller. This is an API route: it
 * returns JSON and must never depend on a view route. Model and controller are
 * wired together here (constructor injection) using the shared Prisma client.
 */

import express from 'express';
import { prisma } from '../../lib/prisma.js';
import { HealthModel } from '../../models/health.model.js';
import { HealthController } from '../../controllers/health.controller.js';

const router = express.Router();
const healthController = new HealthController(new HealthModel(prisma));

// GET /api/v1/health -> report service and database health.
router.get('/health', (req, res) => healthController.check(req, res));

export default router;
