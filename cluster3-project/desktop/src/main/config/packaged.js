/**
 * @file Configuration baked into a packaged build.
 *
 * An installed app opened from Finder or the Start menu has no shell
 * environment and no .env beside it, so the values ./env.js requires would be
 * missing and the main process would stop at launch. Instead, `pnpm dist:*`
 * validates the build machine's environment once and writes the result into
 * the package as app-config.json; the packaged app reads that file and nothing
 * else.
 *
 * Only the variables that decide which API the app talks to are baked. The
 * development-only ones (DEV_SERVER_URL, USE_BUILT_RENDERER) mean nothing in a
 * packaged app, which always serves its compiled renderer. No per-environment
 * value appears in source: each build takes them from its own environment.
 *
 * Like ./env.js, this module is pure — it never reads process.env or the disk
 * on its own — so the test suite can exercise it with fabricated inputs.
 */

const path = require('node:path');

const { createConfig } = require('./env.js');

/** File name of the baked configuration, at the root of the packaged app. */
const PACKAGED_CONFIG_FILE = 'app-config.json';

/** Variables written into a packaged build. */
const BAKED_VARIABLES = Object.freeze(['NODE_ENV', 'API_BASE_URL', 'API_TIMEOUT_MS']);

/**
 * Select and validate the variables a packaged build carries.
 *
 * Validating here moves every configuration error from the moment a user
 * opens the installed app to the moment the installer is built.
 *
 * @param {Record<string, string|undefined>} source - The build machine's
 *   environment.
 * @returns {{values: Record<string, string>, nodeEnv: string}} The variables
 *   to write, as strings exactly as ./env.js expects them, and the resolved
 *   environment name for labelling the installer.
 * @throws {Error} When the environment would fail ./env.js validation.
 */
function bakeConfigSource(source) {
  const { nodeEnv } = createConfig(source);
  const values = { NODE_ENV: nodeEnv };
  for (const name of BAKED_VARIABLES) {
    if (source[name] !== undefined && source[name] !== '') values[name] = source[name];
  }
  return { values, nodeEnv };
}

/**
 * Read the baked configuration of a packaged app.
 *
 * @param {string} appRoot - The packaged app's root, i.e. `app.getAppPath()`.
 * @param {(file: string) => string} readFile - Reads a file as UTF-8 text;
 *   injected so tests need no real file.
 * @returns {Record<string, string>} The baked variables, ready for
 *   createConfig().
 * @throws {Error} When the file is missing or is not a JSON object, with a
 *   message that says how to rebuild.
 */
function readPackagedSource(appRoot, readFile) {
  const file = path.join(appRoot, PACKAGED_CONFIG_FILE);
  let parsed;
  try {
    parsed = JSON.parse(readFile(file));
  } catch (error) {
    throw new Error(
      `Cannot read the packaged configuration at ${file} (${error.message}). ` +
        'Rebuild the installer with pnpm dist:mac or pnpm dist:win.',
    );
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`The packaged configuration at ${file} is not a JSON object.`);
  }
  return parsed;
}

module.exports = { BAKED_VARIABLES, PACKAGED_CONFIG_FILE, bakeConfigSource, readPackagedSource };
