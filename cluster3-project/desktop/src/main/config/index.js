/**
 * @file Composes the application's configuration singleton.
 *
 * createConfig() in ./env.js is pure and side-effect free so it can be tested
 * with a fabricated environment. Something still has to load the real .env
 * file and hand createConfig() the real process.env — that composition lives
 * here, kept out of env.js so requiring env.js (as the test suite does) never
 * touches the developer's machine or needs a .env to exist. Validation still
 * throws at import time: the application fails fast rather than starting
 * half-configured, and this is the only module the application imports for
 * configuration.
 */

const dotenv = require('dotenv');

const { createConfig } = require('./env.js');

// quiet: true suppresses dotenv's promotional banner, which would otherwise
// print on every main-process launch.
dotenv.config({ quiet: true });

/**
 * The single source of configuration for the main process.
 * @type {Readonly<import('./env.js').AppConfig>}
 */
const config = createConfig(process.env);

module.exports = { config };
