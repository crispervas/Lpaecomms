/**
 * @file Environment variable parsing and validation.
 *
 * Exports createConfig(), a pure function with no side effects: it neither
 * reads process.env nor loads a .env file, so tests can hand it a fabricated
 * environment without touching the developer's machine or requiring a real
 * .env to exist. Composing the application's actual configuration — loading
 * dotenv, then calling createConfig(process.env) — is the job of ./index.js,
 * which is what the running application imports; this module is not.
 *
 * No value is hardcoded per environment and nothing branches on a hostname.
 */

/**
 * Environments the application recognises.
 * @type {readonly ['development', 'staging', 'production']}
 */
const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 5000;

/** Default Vite dev server URL; matches the pinned port in vite.config.mjs. */
const DEFAULT_DEV_SERVER_URL = 'http://localhost:5173';

/**
 * Read a required, non-empty variable.
 *
 * @param {Record<string, string|undefined>} source - Environment to read from.
 * @param {string} name - Variable name.
 * @returns {string} The variable's non-empty value.
 * @throws {Error} When the variable is missing or empty.
 */
function required(source, name) {
  const value = source[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Validate that a value parses as an absolute URL.
 *
 * @param {string} raw - Candidate URL.
 * @param {string} name - Variable name, used in the error message.
 * @returns {string} The unchanged value once validated.
 * @throws {Error} When the value is not a parseable absolute URL.
 */
function parseUrl(raw, name) {
  try {
    // eslint-disable-next-line no-new
    new URL(raw);
  } catch {
    throw new Error(`Invalid ${name} "${raw}". Expected an absolute URL.`);
  }
  return raw;
}

/**
 * Parse a timeout and fail loudly when it is not a positive integer.
 *
 * @param {string} raw - Raw millisecond value.
 * @returns {number} A positive integer.
 * @throws {Error} When the value is not a positive integer.
 */
function parseTimeout(raw) {
  const timeout = Number.parseInt(raw, 10);
  if (!Number.isInteger(timeout) || timeout < 1) {
    throw new Error(`Invalid API_TIMEOUT_MS "${raw}". Expected a positive integer.`);
  }
  return timeout;
}

/**
 * Parse a strict boolean literal.
 *
 * Only "true" and "false" are accepted. Anything looser ("1", "yes", "") would
 * make a typo silently mean false, and this flag decides which renderer the
 * window loads — a wrong value shows a blank window with no error.
 *
 * @param {string} raw - Raw value from the environment.
 * @param {string} name - Variable name, used in the error message.
 * @returns {boolean} The parsed boolean.
 * @throws {Error} When the value is not exactly "true" or "false".
 */
function parseBoolean(raw, name) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Invalid ${name} "${raw}". Expected "true" or "false".`);
}

/**
 * Application configuration derived from environment variables.
 *
 * @typedef {Object} AppConfig
 * @property {string} nodeEnv - Active environment name.
 * @property {string} apiBaseUrl - Base URL of the REST API, including /api/v1.
 * @property {number} apiTimeoutMs - Request timeout in milliseconds.
 * @property {string} devServerUrl - Vite dev server URL, used when not packaged.
 * @property {boolean} useBuiltRenderer - Load the compiled renderer even when
 *   the app is not packaged. Testing aid for the production render path.
 * @property {boolean} isDevelopment - True when running in development.
 * @property {boolean} isStaging - True when running in staging.
 * @property {boolean} isProduction - True when running in production.
 */

/**
 * Build a validated configuration object from an environment-like source.
 *
 * Taking the source as a parameter rather than reading `process.env` directly is
 * what makes import-time validation testable: a test can hand this function a
 * broken environment without mutating the real one.
 *
 * @param {Record<string, string|undefined>} source - Environment variables.
 * @returns {Readonly<AppConfig>} Frozen configuration.
 * @throws {Error} When any variable is missing or invalid.
 */
function createConfig(source) {
  const nodeEnv = source.NODE_ENV ?? 'development';
  if (!VALID_ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${nodeEnv}". Expected one of: ${VALID_ENVIRONMENTS.join(', ')}`,
    );
  }

  return Object.freeze({
    nodeEnv,
    apiBaseUrl: parseUrl(required(source, 'API_BASE_URL'), 'API_BASE_URL'),
    apiTimeoutMs: parseTimeout(source.API_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS)),
    devServerUrl: parseUrl(source.DEV_SERVER_URL ?? DEFAULT_DEV_SERVER_URL, 'DEV_SERVER_URL'),
    useBuiltRenderer: parseBoolean(source.USE_BUILT_RENDERER ?? 'false', 'USE_BUILT_RENDERER'),
    isDevelopment: nodeEnv === 'development',
    isStaging: nodeEnv === 'staging',
    isProduction: nodeEnv === 'production',
  });
}

module.exports = { createConfig };
