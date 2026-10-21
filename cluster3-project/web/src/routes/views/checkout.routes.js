/**
 * @file Checkout view routes.
 *
 * Maps the checkout URLs — Shipping, Payment, Confirmation — to the checkout
 * controller, every one behind requireCustomer. View routes: they render EJS
 * templates or redirect, and create the order through PurchaseModel rather
 * than the API, so they never depend on an API route.
 */

import express from 'express';
import { CheckoutController } from '../../controllers/checkout.controller.js';
import { prisma } from '../../lib/prisma.js';
import { requireCustomer } from '../../middlewares/customerSession.js';
import { CustomerModel } from '../../models/customer.model.js';
import { ProductModel } from '../../models/product.model.js';
import { PurchaseModel } from '../../models/purchase.model.js';
import purchaseResource from '../../resources/purchase.resource.js';

const router = express.Router();
const checkoutController = new CheckoutController(
  new ProductModel(),
  new CustomerModel(),
  new PurchaseModel(prisma, purchaseResource),
);

router.use('/checkout', requireCustomer);

// GET /checkout/shipping  -> the delivery address form.
router.get('/checkout/shipping', (req, res) => checkoutController.showShipping(req, res));

// POST /checkout/shipping -> keep the address, on to payment.
router.post('/checkout/shipping', (req, res) => checkoutController.saveShipping(req, res));

// GET /checkout/payment   -> the order summary and the card form.
router.get('/checkout/payment', (req, res) => checkoutController.showPayment(req, res));

// POST /checkout/payment  -> take the simulated payment and create the order.
router.post('/checkout/payment', (req, res) => checkoutController.pay(req, res));

// GET /checkout/confirmation/:id -> the placed order, for its owner only.
router.get('/checkout/confirmation/:id', (req, res, next) => checkoutController.showConfirmation(req, res, next));

export default router;
