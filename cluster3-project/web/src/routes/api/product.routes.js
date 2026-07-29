/**
 * @file Product API routes.
 *
 * Maps the catalogue URL to the product controller. This is an API route: it
 * returns JSON and must never depend on a view route. Model and controller are
 * wired together here through constructor injection.
 */

import express from 'express';
import { ProductModel } from '../../models/product.model.js';
import { ProductController } from '../../controllers/product.controller.js';

const router = express.Router();
const productController = new ProductController(new ProductModel());

// GET /api/v1/products -> the catalogue with store locations.
router.get('/products', (req, res, next) => productController.list(req, res, next));

export default router;
