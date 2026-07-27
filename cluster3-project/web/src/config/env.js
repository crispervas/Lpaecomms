/**
 * @file Environment configuration.
 *
 * Reads and validates process environment variables and exposes a single,
 * frozen configuration object for the rest of the application. Validation runs
 * at import time and throws when a required variable is missing or invalid, so
 * the server fails fast instead of starting in a half-configured state. No
 * value is hardcoded per environment and nothing branches on a hostname.
 */

import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

// Load .env and expand ${VAR} references so DATABASE_URL can be composed from
// the individual POSTGRES_* variables rather than duplicating them.
expand(dotenv.config({ override: true }));

/**
 * Environments the application recognises.
 * @type {readonly ['development', 'staging', 'production']}
 */
const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

/**
 * Read a required environment variable.
 *
 * @param {string} name - Variable name to read from `process.env`.
 * @returns {string} The variable's non-empty value.
 * @throws {Error} When the variable is missing or empty.
 */
function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Parse a port number and fail loudly when it is not a valid TCP port.
 *
 * @param {string} raw - Raw port value from the environment.
 * @returns {number} A valid port in the range 1-65535.
 * @throws {Error} When the value is not an integer within the valid range.
 */
function parsePort(raw) {
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${raw}". Expected an integer between 1 and 65535.`);
  }
  return port;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!VALID_ENVIRONMENTS.includes(nodeEnv)) {
  throw new Error(
    `Invalid NODE_ENV "${nodeEnv}". Expected one of: ${VALID_ENVIRONMENTS.join(', ')}`,
  );
}

/**
 * Application configuration derived from environment variables.
 *
 * @typedef {Object} AppConfig
 * @property {string} nodeEnv - Active environment name.
 * @property {number} port - HTTP port the server listens on.
 * @property {string} databaseUrl - PostgreSQL connection string for Prisma.
 * @property {boolean} isDevelopment - True when running in development.
 * @property {boolean} isStaging - True when running in staging.
 * @property {boolean} isProduction - True when running in production.
 */

/**
 * The single source of configuration for the application. Frozen so consumers
 * cannot mutate it at runtime.
 *
 * @type {Readonly<AppConfig>}
 */
export const config = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT ?? '3000'),
  databaseUrl: required('DATABASE_URL'),
  isDevelopment: nodeEnv === 'development',
  isStaging: nodeEnv === 'staging',
  isProduction: nodeEnv === 'production',
});
