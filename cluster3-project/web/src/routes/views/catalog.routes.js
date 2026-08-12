/**
 * @file Catalog view routes.
 *
 * Maps the catalog URL to the catalog controller. This is a view route: it
 * renders an EJS template and returns HTML. It must never depend on an API
 * route. Model and controller are wired together here through constructor
 * injection.
 */

import express from 'express';
import { CatalogController } from '../../controllers/catalog.controller.js';
import { ProductModel } from '../../models/product.model.js';
import { CategoryModel } from '../../models/category.model.js';

const router = express.Router();
const catalogController = new CatalogController(new ProductModel(), new CategoryModel());

// GET /catalog -> render the storefront catalog page. `next` is forwarded so an
// unknown category falls through to the shared 404 page.
router.get('/catalog', (req, res, next) => catalogController.index(req, res, next));

export default router;
