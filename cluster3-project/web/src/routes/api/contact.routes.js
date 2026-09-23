/**
 * @file Contact API routes.
 *
 * Maps the contact URL to the contact API controller. This is an API route:
 * it returns JSON and must never depend on a view route (the web form's own
 * POST /contact is a separate view route).
 */

import express from 'express';
import { ContactApiController } from '../../controllers/contactApi.controller.js';

const router = express.Router();
const contactApiController = new ContactApiController();

// POST /api/v1/contact -> validate and accept a contact message.
router.post('/contact', (req, res, next) => contactApiController.submit(req, res, next));

export default router;
