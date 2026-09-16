/**
 * @file Preferences view routes.
 *
 * Maps the appearance page and its save. These are view routes: they render
 * HTML or answer with a status, never with JSON, and they must never depend on
 * an API route.
 */

import express from 'express';
import { PreferencesController } from '../../controllers/preferences.controller.js';

const router = express.Router();
const preferencesController = new PreferencesController();

router.get('/preferences', (req, res) => preferencesController.show(req, res));
router.post('/preferences', (req, res) => preferencesController.save(req, res));

export default router;
