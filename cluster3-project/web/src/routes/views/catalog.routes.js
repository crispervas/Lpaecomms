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

const router = express.Router();
const catalogController = new CatalogController(new ProductModel());

// GET /catalog -> render the storefront catalog page. Returning the
// controller's promise lets Express 5 forward a rejection to the error
// middleware on its own.
router.get('/catalog', (req, res) => catalogController.index(req, res));

export default router;
