/**
 * @file Password API routes.
 *
 * Maps the breach lookup URL to the password controller. This is an API route:
 * it returns JSON and must never depend on a view route.
 */

import express from 'express';
import { BreachModel } from '../../models/breach.model.js';
import { PasswordController } from '../../controllers/password.controller.js';

const router = express.Router();
const passwordController = new PasswordController(new BreachModel());

// GET /api/v1/password/breaches -> known breached hash suffixes for a prefix.
router.get('/password/breaches', (req, res, next) => passwordController.check(req, res, next));

export default router;
