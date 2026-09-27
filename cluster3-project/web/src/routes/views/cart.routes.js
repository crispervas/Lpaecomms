/**
 * @file Cart view routes.
 *
 * Maps the cart URLs to the cart controller. View routes: GET renders the page
 * and each POST answers with a redirect back to it, so none of them depends on
 * an API route. Model and controller are wired together here through
 * constructor injection.
 */

import express from 'express';
import { CartController } from '../../controllers/cart.controller.js';
import { ProductModel } from '../../models/product.model.js';

const router = express.Router();
const cartController = new CartController(new ProductModel());

// GET /cart -> render the cart, priced from the catalogue.
router.get('/cart', (req, res) => cartController.show(req, res));

// POST /cart/items -> add a product (from its page), then back to /cart.
router.post('/cart/items', (req, res) => cartController.add(req, res));

// POST /cart/items/:id -> set a line's quantity, then back to /cart.
router.post('/cart/items/:id', (req, res) => cartController.update(req, res));

// POST /cart/items/:id/remove -> remove a line, then back to /cart. A POST
// rather than a DELETE because an HTML form can send nothing else.
router.post('/cart/items/:id/remove', (req, res) => cartController.remove(req, res));

export default router;
