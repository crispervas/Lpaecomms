/**
 * @file API routes for account status: block, unblock, and the self-delete guard.
 *
 * Mounted before the generic CRUD routers so the guard on DELETE /users/:id
 * runs first; when it lets a request through, Express carries on to the
 * generic delete route.
 */

import express from 'express';
import boom from '@hapi/boom';
import { z } from 'zod';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { updateTime } from '../../middlewares/audit.js';
import { urlId } from '../../lib/dbInt.js';
import { UserModel } from '../../models/user.model.js';
import userResource from '../../resources/user.resource.js';
import { UserStatusController } from '../../controllers/userStatus.controller.js';

const idParams = z.object({ id: urlId() });

/**
 * Build the account status router.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - Client for the user model.
 * @returns {import('express').Router} Router with block, unblock and the delete guard.
 */
export function buildUserStatusRouter(prisma) {
  const router = express.Router();
  const controller = new UserStatusController(new UserModel(prisma, userResource));
  const admin = [authenticate, authorize('ADMIN'), validate({ params: idParams })];

  // POST /api/v1/users/:id/block   -> the account can no longer sign in.
  router.post('/users/:id/block', ...admin, updateTime, controller.handler(true));
  // POST /api/v1/users/:id/unblock -> the account is ACTIVE again.
  router.post('/users/:id/unblock', ...admin, updateTime, controller.handler(false));

  // DELETE /api/v1/users/:id -> refuse your own account, else fall through.
  router.delete('/users/:id', ...admin, (req, res, next) => {
    if (req.valid.params.id === req.user.id) {
      return next(boom.conflict('You cannot delete your own account.'));
    }
    next();
  });

  return router;
}
