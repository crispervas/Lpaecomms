/**
 * @file Paged catalogue API routes.
 *
 * Maps the catalogue URL to the catalogue API controller. This is an API
 * route: it returns JSON and must never depend on a view route.
 */

import express from 'express';
import { ProductModel } from '../../models/product.model.js';
import { CategoryModel } from '../../models/category.model.js';
import { CatalogApiController } from '../../controllers/catalogApi.controller.js';

const router = express.Router();
const catalogApiController = new CatalogApiController(new ProductModel(), new CategoryModel());

// GET /api/v1/catalog -> one page of products, optionally for one category.
router.get('/catalog', (req, res, next) => catalogApiController.list(req, res, next));

export default router;
