/**
 * @file Environment file selection: which `.env*` file each NODE_ENV reads,
 * and how a file's values reach the environment.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadEnv, resolveEnvFile } from '../src/config/loadEnv.js';

const ROOT = '/app';

/**
 * An `exists` double answering from a fixed list of file names.
 *
 * @param {...string} names - File names present in ROOT.
 * @returns {(file: string) => boolean} The double.
 */
const present = (...names) => (file) => names.includes(path.basename(file));

/**
 * Write files into a fresh temporary directory.
 *
 * @param {Record<string, string>} files - File name to contents.
 * @returns {string} The directory.
 */
function tempDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lpa-env-'));
  for (const [name, contents] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), contents);
  return dir;
}

test('NODE_ENV picks its own file when it exists', () => {
  assert.equal(
    resolveEnvFile(ROOT, 'production', present('.env', '.env.production')),
    path.join(ROOT, '.env.production'),
  );
});

test('without NODE_ENV the development file is read', () => {
  assert.equal(
    resolveEnvFile(ROOT, undefined, present('.env', '.env.development')),
    path.join(ROOT, '.env.development'),
  );
});

test('a missing environment file falls back to .env', () => {
  assert.equal(resolveEnvFile(ROOT, 'staging', present('.env')), path.join(ROOT, '.env'));
});

test('no file at all means the real environment alone', () => {
  assert.equal(resolveEnvFile(ROOT, 'production', present()), null);
});

test('an unknown NODE_ENV never names a file of its own', () => {
  assert.equal(resolveEnvFile(ROOT, '../secrets', present('.env', '.env.../secrets')), path.join(ROOT, '.env'));
});

test('loadEnv reads the chosen file and expands references', () => {
  const dir = tempDir({ '.env.production': 'USER_NAME=lpa\nDATABASE_URL=postgres://${USER_NAME}@db/x\n', '.env': 'USER_NAME=wrong\n' });
  const env = { NODE_ENV: 'production' };
  assert.equal(loadEnv({ root: dir, env }), path.join(dir, '.env.production'));
  assert.equal(env.DATABASE_URL, 'postgres://lpa@db/x');
});

test('the NODE_ENV chosen in the shell wins over one written in the file', () => {
  const dir = tempDir({ '.env.production': 'NODE_ENV=development\n' });
  const env = { NODE_ENV: 'production' };
  loadEnv({ root: dir, env });
  assert.equal(env.NODE_ENV, 'production');
});

test('with no file, loadEnv leaves the environment as it was', () => {
  const env = { NODE_ENV: 'production', DATABASE_URL: 'postgres://render' };
  assert.equal(loadEnv({ root: tempDir({}), env }), null);
  assert.deepEqual(env, { NODE_ENV: 'production', DATABASE_URL: 'postgres://render' });
});
