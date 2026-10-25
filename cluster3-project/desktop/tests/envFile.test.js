/**
 * @file Tests for which `.env*` file the desktop reads in each environment.
 *
 * The same rule serves development (src/main/config/index.js) and the
 * installer build (scripts/dist.mjs), and matches the web's loadEnv.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { resolveEnvFile } = require('../src/main/config/envFile.js');

const ROOT = '/app';

/**
 * An `exists` double answering from a fixed list of file names.
 *
 * @param {...string} names - File names present in ROOT.
 * @returns {(file: string) => boolean} The double.
 */
const present = (...names) => (file) => names.includes(path.basename(file));

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
