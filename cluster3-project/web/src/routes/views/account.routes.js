/**
 * @file Account view routes.
 *
 * Maps the Account URLs to the account controller, behind requireCustomer so
 * only a signed-in customer reaches them. View routes: they render EJS
 * templates or redirect, reading and saving through CustomerModel, and must
 * never depend on an API route.
 */

import express from 'express';
import { AccountController } from '../../controllers/account.controller.js';
import { requireCustomer } from '../../middlewares/customerSession.js';
import { CustomerModel } from '../../models/customer.model.js';

const router = express.Router();
const accountController = new AccountController(new CustomerModel());

// GET /account  -> render the profile tab, or the orders tab with ?tab=orders.
router.get('/account', requireCustomer, (req, res) => accountController.show(req, res));

// POST /account -> validate and save the profile, then back to the page.
router.post('/account', requireCustomer, (req, res) => accountController.saveProfile(req, res));

export default router;
