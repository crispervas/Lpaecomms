/**
 * @file Auth view routes.
 *
 * Maps the login and logout URLs to the auth controller. View routes: they
 * render EJS templates or redirect, reading accounts through CustomerModel,
 * and must never depend on an API route.
 */

import express from 'express';
import { AuthController } from '../../controllers/auth.controller.js';
import { CustomerModel } from '../../models/customer.model.js';

const router = express.Router();
const authController = new AuthController(new CustomerModel());

// GET /login  -> render the login form (a signed-in customer goes to /account).
router.get('/login', (req, res) => authController.showLogin(req, res));

// POST /login -> log in or sign up; success sets the session cookie and redirects.
router.post('/login', (req, res) => authController.login(req, res));

// POST /logout -> clear the session cookie, back to the home page. A POST so no
// link or image on another site can sign a customer out.
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
