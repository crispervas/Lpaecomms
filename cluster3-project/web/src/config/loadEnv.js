/**
 * @file Environment file loading.
 *
 * Picks one `.env*` file for the environment and loads it into the process
 * environment. The app (config/env.js), the Prisma CLI (prisma.config.js) and
 * the seed (prisma/seed.js) all call this, so the three always read the same
 * values. The rule matches the desktop's build script:
 *
 * - `NODE_ENV` from the shell, or `development` when unset, names the
 *   environment, and `.env.<NODE_ENV>` is read when it exists;
 * - otherwise `.env` is read, so a single local file keeps working;
 * - with neither, nothing is read and the real environment stands alone —
 *   which is the case on a host like Render, where variables are set in its
 *   dashboard and no `.env` file is deployed.
 *
 * File values override the shell, as the single `.env` always did, except
 * `NODE_ENV` itself: a file must not quietly switch the environment the shell
 * chose to load it for.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

/** The web project's root, where the `.env*` files live. */
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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
export function resolveEnvFile(root, nodeEnv, exists = fs.existsSync) {
  const environment = nodeEnv || 'development';
  // Only a known name builds a path, so NODE_ENV cannot point elsewhere.
  if (ENVIRONMENTS.includes(environment)) {
    const specific = path.join(root, `.env.${environment}`);
    if (exists(specific)) return specific;
  }
  const shared = path.join(root, '.env');
  return exists(shared) ? shared : null;
}

/**
 * Load the environment file into an environment object, expanding `${VAR}`
 * references so DATABASE_URL can be composed from the POSTGRES_* values.
 *
 * @param {Object} [options] - Where to read from and write to.
 * @param {string} [options.root] - Directory holding the `.env*` files.
 * @param {Record<string, string|undefined>} [options.env] - Environment to fill.
 * @returns {string|null} The file that was read, or null when none was.
 */
export function loadEnv({ root = WEB_ROOT, env = process.env } = {}) {
  const shellNodeEnv = env.NODE_ENV;
  const file = resolveEnvFile(root, shellNodeEnv);
  if (!file) return null;

  // `quiet` suppresses dotenv's own stdout tip on every load (as of v17); it
  // does not hide errors in a malformed file.
  expand({ ...dotenv.config({ path: file, override: true, quiet: true, processEnv: env }), processEnv: env });
  if (shellNodeEnv) env.NODE_ENV = shellNodeEnv;
  return file;
}
