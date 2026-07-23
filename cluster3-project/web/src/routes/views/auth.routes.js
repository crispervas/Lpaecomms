/**
 * @file Auth view routes.
 *
 * Maps the login URLs to the auth controller. View routes: they render EJS
 * templates and return HTML. The POST handler re-renders the page (no
 * authentication yet), so it stays a view route and must never depend on an API
 * route.
 */

import express from 'express';
import { AuthController } from '../../controllers/auth.controller.js';

const router = express.Router();
const authController = new AuthController();

// GET /login  -> render the login form.
router.get('/login', (req, res) => authController.showLogin(req, res));

// POST /login -> acknowledge the submission (authentication not implemented yet).
router.post('/login', (req, res) => authController.login(req, res));

export default router;
