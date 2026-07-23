/**
 * @file Server entry point.
 *
 * Loads validated configuration, builds the Express application, and starts
 * listening. This is the process launched in every environment; all
 * environment-specific behaviour comes from configuration, never from code.
 */

import { config } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`web (${config.nodeEnv}) listening on http://localhost:${config.port}`);
});
