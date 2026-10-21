/**
 * @file API route for store statistics: GET /stats, admins only.
 */

import express from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { StatsModel } from '../../models/stats.model.js';
import { StatsController } from '../../controllers/stats.controller.js';

/**
 * Build the statistics router.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - Client for the counts.
 * @returns {import('express').Router} Router with GET /stats.
 */
export function buildStatsRouter(prisma) {
  const router = express.Router();
  const controller = new StatsController(new StatsModel(prisma));

  // GET /api/v1/stats -> the admin dashboard's figures.
  router.get('/stats', authenticate, authorize('ADMIN'), (req, res, next) => controller.show(req, res, next));

  return router;
}
