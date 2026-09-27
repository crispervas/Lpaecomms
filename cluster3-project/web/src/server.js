/**
 * @file Server entry point.
 *
 * Loads validated configuration, builds the Express application, and starts
 * listening. This is the process launched in every environment; all
 * environment-specific behaviour comes from configuration, never from code.
 */

import { config } from './config/env.js';
import { createApp } from './app.js';
import { HomeController } from './controllers/home.controller.js';
import { ProductModel } from './models/product.model.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`It was Developed by Cristhian Pereira`);
  console.log(`web (${config.nodeEnv}) listening on http://localhost:${config.port}`);

  // Warmed here rather than in createApp so tests, which build the app
  // without listening, never reach the real feed. Not awaited: the server
  // accepts requests while it runs, and a request that arrives first simply
  // shares the same feed call.
  HomeController.warmCache(new ProductModel());
});
