/**
 * @file Home view routes.
 *
 * Maps the storefront home URL to the home controller. This is a view route:
 * it renders an EJS template and returns HTML. It must never depend on an API
 * route.
 */

import express from 'express';
import { HomeController } from '../../controllers/home.controller.js';
import { ProductModel } from '../../models/product.model.js';

const router = express.Router();
const homeController = new HomeController(new ProductModel());

// GET / -> render the storefront home page. Returning the controller's promise
// lets Express 5 forward a rejection to the error middleware on its own.
router.get('/', (req, res) => homeController.index(req, res));

export default router;
