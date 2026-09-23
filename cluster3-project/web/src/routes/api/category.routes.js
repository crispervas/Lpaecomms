/**
 * @file Category API routes.
 *
 * Maps the category list URL to the category controller. This is an API route:
 * it returns JSON and must never depend on a view route.
 */

import express from 'express';
import { CategoryModel } from '../../models/category.model.js';
import { CategoryController } from '../../controllers/category.controller.js';

const router = express.Router();
const categoryController = new CategoryController(new CategoryModel());

// GET /api/v1/categories -> categories that currently hold products.
router.get('/categories', (req, res, next) => categoryController.list(req, res, next));

export default router;
