/**
 * @file API authentication routes.
 *
 * POST /auth/login. JSON only; the web's own sign-in page is a view route and
 * does not use this.
 */

import express from 'express';
import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';
import { UserModel } from '../../models/user.model.js';
import userResource from '../../resources/user.resource.js';
import { AuthApiController } from '../../controllers/authApi.controller.js';

/** Login body; the email is normalised the same way users are stored. */
const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

/**
 * Build the auth router.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - Client for the user model.
 * @returns {import('express').Router} Router with POST /auth/login.
 */
export function buildAuthRouter(prisma) {
  const router = express.Router();
  const controller = new AuthApiController(new UserModel(prisma, userResource));

  // POST /api/v1/auth/login -> exchange credentials for an access token.
  router.post('/auth/login', validate({ body: loginBody }), (req, res, next) => controller.login(req, res, next));

  return router;
}
