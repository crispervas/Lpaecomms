/**
 * @file Currency API routes.
 *
 * Maps the conversion URL to the currency controller. This is an API route: it
 * returns JSON and must never depend on a view route. The provider key is read
 * from the validated environment config here and injected into the model, which
 * keeps the model free of configuration and therefore testable.
 */

import express from 'express';
import { config } from '../../config/env.js';
import { CurrencyModel } from '../../models/currency.model.js';
import { CurrencyController } from '../../controllers/currency.controller.js';

const router = express.Router();
const currencyController = new CurrencyController(new CurrencyModel(config.ninjaApiKey));

// GET /api/v1/convert -> convert an amount between supported currencies.
router.get('/convert', (req, res, next) => currencyController.convert(req, res, next));

export default router;
