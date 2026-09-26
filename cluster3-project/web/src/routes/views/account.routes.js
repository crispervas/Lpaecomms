/**
 * @file Account view routes.
 *
 * Maps the Account URLs to the account controller. View routes: they render
 * EJS templates and return HTML. The POST handler re-renders the page (nothing
 * is saved yet), so it stays a view route and must never depend on an API
 * route.
 */

import express from 'express';
import { AccountController } from '../../controllers/account.controller.js';

const router = express.Router();
const accountController = new AccountController();

// GET /account  -> render the profile tab, or the orders tab with ?tab=orders.
router.get('/account', (req, res) => accountController.show(req, res));

// POST /account -> validate the profile form (saving not implemented yet).
router.post('/account', (req, res) => accountController.saveProfile(req, res));

export default router;
