/**
 * @file Composes the application's configuration singleton.
 *
 * createConfig() in ./env.js is pure and side-effect free so it can be tested
 * with a fabricated environment. Something still has to choose the real source
 * and hand it to createConfig() — that composition lives here, kept out of
 * env.js so requiring env.js (as the test suite does) never touches the
 * developer's machine or needs a .env to exist.
 *
 * The source depends on how the app runs:
 * - Packaged: the app-config.json baked into the build (see ./packaged.js).
 *   The shell environment is ignored on purpose, so a stray NODE_ENV on a
 *   user's machine cannot point an installed app at another API.
 * - Otherwise: the .env file, then process.env, as during development.
 *
 * Validation still throws at import time: the application fails fast rather
 * than starting half-configured, and this is the only module the application
 * imports for configuration.
 */

const fs = require('node:fs');

const dotenv = require('dotenv');
const { app } = require('electron');

const { createConfig } = require('./env.js');
const { readPackagedSource } = require('./packaged.js');

/**
 * Pick the variables to configure the app from.
 *
 * @returns {Record<string, string|undefined>} The configuration source.
 * @throws {Error} When a packaged build has no readable app-config.json.
 */
function loadSource() {
  if (app.isPackaged) {
    return readPackagedSource(app.getAppPath(), (file) => fs.readFileSync(file, 'utf8'));
  }
  // quiet: true suppresses dotenv's promotional banner, which would otherwise
  // print on every main-process launch.
  dotenv.config({ quiet: true });
  return process.env;
}

/**
 * The single source of configuration for the main process.
 * @type {Readonly<import('./env.js').AppConfig>}
 */
const config = createConfig(loadSource());

module.exports = { config };
