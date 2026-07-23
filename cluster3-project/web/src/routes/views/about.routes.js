/**
 * @file About view routes.
 *
 * Maps the About URL to the about controller. A view route: it renders an EJS
 * template and returns HTML. It must never depend on an API route.
 */

import express from 'express';
import { AboutController } from '../../controllers/about.controller.js';

const router = express.Router();
const aboutController = new AboutController();

// GET /about -> render the About page.
router.get('/about', (req, res) => aboutController.index(req, res));

export default router;
