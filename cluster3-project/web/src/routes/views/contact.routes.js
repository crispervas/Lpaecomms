/**
 * @file Contact view routes.
 *
 * Maps the Contact URLs to the contact controller. View routes: they render EJS
 * templates and return HTML. The POST handler processes the form and re-renders
 * the page, so it stays a view route and must never depend on an API route.
 */

import express from 'express';
import { ContactController } from '../../controllers/contact.controller.js';

const router = express.Router();
const contactController = new ContactController();

// GET /contact  -> render the contact form.
router.get('/contact', (req, res) => contactController.show(req, res));

// POST /contact -> validate and process the submission.
router.post('/contact', (req, res) => contactController.submit(req, res));

export default router;
