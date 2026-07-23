/**
 * @file Home view routes.
 *
 * Maps the storefront home URL to the home controller. This is a view route:
 * it renders an EJS template and returns HTML. It must never depend on an API
 * route.
 */

import express from 'express';
import { HomeController } from '../../controllers/home.controller.js';

const router = express.Router();
const homeController = new HomeController();

// GET / -> render the storefront home page.
router.get('/', (req, res) => homeController.index(req, res));

export default router;
