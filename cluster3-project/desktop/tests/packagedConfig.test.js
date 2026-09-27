/**
 * @file Tests for the configuration baked into packaged builds.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  PACKAGED_CONFIG_FILE,
  bakeConfigSource,
  readPackagedSource,
} = require('../src/main/config/packaged.js');

test('bakes only the variables that choose the API', () => {
  const { values, nodeEnv } = bakeConfigSource({
    NODE_ENV: 'staging',
    API_BASE_URL: 'https://staging.example/api/v1',
    API_TIMEOUT_MS: '8000',
    DEV_SERVER_URL: 'http://localhost:5173',
    USE_BUILT_RENDERER: 'true',
    HOME: '/Users/someone',
  });
  assert.equal(nodeEnv, 'staging');
  assert.deepEqual(values, {
    NODE_ENV: 'staging',
    API_BASE_URL: 'https://staging.example/api/v1',
    API_TIMEOUT_MS: '8000',
  });
});

test('writes the resolved environment even when NODE_ENV is unset', () => {
  const { values } = bakeConfigSource({ API_BASE_URL: 'http://localhost:3000/api/v1' });
  assert.equal(values.NODE_ENV, 'development');
  assert.equal('API_TIMEOUT_MS' in values, false);
});

test('fails the build, not the installed app, on a bad environment', () => {
  assert.throws(() => bakeConfigSource({ NODE_ENV: 'production' }), /API_BASE_URL/);
  assert.throws(
    () => bakeConfigSource({ NODE_ENV: 'qa', API_BASE_URL: 'https://x.example' }),
    /Invalid NODE_ENV/,
  );
});

test('reads the baked file from the app root', () => {
  let asked;
  const source = readPackagedSource('/app', (file) => {
    asked = file;
    return '{"NODE_ENV":"production","API_BASE_URL":"https://x.example/api/v1"}';
  });
  assert.equal(asked, path.join('/app', PACKAGED_CONFIG_FILE));
  assert.deepEqual(source, { NODE_ENV: 'production', API_BASE_URL: 'https://x.example/api/v1' });
});

test('explains how to rebuild when the file is missing or malformed', () => {
  const missing = () => {
    throw new Error('ENOENT');
  };
  assert.throws(() => readPackagedSource('/app', missing), /Rebuild the installer/);
  assert.throws(() => readPackagedSource('/app', () => '{oops'), /Rebuild the installer/);
  assert.throws(() => readPackagedSource('/app', () => '[1]'), /not a JSON object/);
});
