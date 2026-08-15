/**
 * @file Product detail view routes.
 *
 * Maps the single-product URL to the product detail controller. This is a view
 * route: it renders an EJS template and returns HTML. It must never depend on
 * an API route. Model and controller are wired together here through
 * constructor injection.
 */

import express from 'express';
import { ProductDetailController } from '../../controllers/productDetail.controller.js';
import { ProductModel } from '../../models/product.model.js';

const router = express.Router();
const productDetailController = new ProductDetailController(new ProductModel());

// GET /product/:id -> render one product's page. Returning the controller's
// promise lets Express 5 forward a rejection to the error middleware on its
// own, which is how an unreadable feed reaches the error page. `next` is
// forwarded so a product that does not exist falls through to the 404 page.
router.get('/product/:id', (req, res, next) => productDetailController.show(req, res, next));

export default router;
