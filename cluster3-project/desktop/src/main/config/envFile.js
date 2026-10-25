/**
 * @file Chooses the `.env*` file for an environment.
 *
 * One rule for every place the desktop reads a file — development
 * (./index.js) and the installer build (scripts/dist.mjs) — and the same rule
 * as the web's loadEnv:
 *
 * - `NODE_ENV` from the shell, or `development` when unset, names the
 *   environment, and `.env.<NODE_ENV>` is read when it exists;
 * - otherwise `.env`, so a single local file keeps working;
 * - with neither, no file: the shell environment alone.
 *
 * Pure apart from the file check, which is injectable for tests.
 */

const fs = require('node:fs');
const path = require('node:path');

/** The desktop project's root, where the `.env*` files live. */
const DESKTOP_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Environments that may have a file of their own. */
const ENVIRONMENTS = ['development', 'staging', 'production'];

/**
 * Decide which environment file to read.
 *
 * @param {string} root - Directory holding the `.env*` files.
 * @param {string|undefined} nodeEnv - NODE_ENV from the shell.
 * @param {(file: string) => boolean} [exists] - File check; tests inject one.
 * @returns {string|null} The file's path, or null when there is none to read.
 */
function resolveEnvFile(root, nodeEnv, exists = fs.existsSync) {
  const environment = nodeEnv || 'development';
  // Only a known name builds a path, so NODE_ENV cannot point elsewhere.
  if (ENVIRONMENTS.includes(environment)) {
    const specific = path.join(root, `.env.${environment}`);
    if (exists(specific)) return specific;
  }
  const shared = path.join(root, '.env');
  return exists(shared) ? shared : null;
}

module.exports = { DESKTOP_ROOT, resolveEnvFile };
