/**
 * @file Mashup view routes.
 *
 * Maps the Mashups URL to the mashup controller. A view route: it renders an EJS
 * template and returns HTML. It must never depend on an API route.
 */

import express from 'express';
import { MashupController } from '../../controllers/mashup.controller.js';

const router = express.Router();
const mashupController = new MashupController();

// GET /mashup -> render the Mashups page.
router.get('/mashup', (req, res) => mashupController.index(req, res));

export default router;
