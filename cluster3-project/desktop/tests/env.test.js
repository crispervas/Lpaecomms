/**
 * @file Tests for environment configuration parsing and validation.
 *
 * These exercise createConfig() directly with fabricated environments, which is
 * why the module can validate at import time without making itself untestable.
 */

// Required by the frozen-object test: assigning to a frozen property throws
// only in strict mode, and CommonJS modules are sloppy mode by default.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/main/config/env.js');

/**
 * A complete, valid environment. Individual tests clone and break one field.
 */
const VALID_ENV = {
  NODE_ENV: 'development',
  API_BASE_URL: 'http://localhost:3000/api/v1',
  API_TIMEOUT_MS: '5000',
  DEV_SERVER_URL: 'http://localhost:5173',
};

test('accepts a complete environment', () => {
  const config = createConfig(VALID_ENV);

  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.apiBaseUrl, 'http://localhost:3000/api/v1');
  assert.equal(config.apiTimeoutMs, 5000);
  assert.equal(config.devServerUrl, 'http://localhost:5173');
  assert.equal(config.isDevelopment, true);
  assert.equal(config.isStaging, false);
  assert.equal(config.isProduction, false);
});

test('freezes the configuration object', () => {
  const config = createConfig(VALID_ENV);

  assert.throws(() => {
    config.apiBaseUrl = 'http://elsewhere';
  }, TypeError);
});

test('throws when API_BASE_URL is missing', () => {
  const env = { ...VALID_ENV, API_BASE_URL: undefined };

  assert.throws(() => createConfig(env), /API_BASE_URL/);
});

test('throws when API_BASE_URL is empty', () => {
  const env = { ...VALID_ENV, API_BASE_URL: '' };

  assert.throws(() => createConfig(env), /API_BASE_URL/);
});

test('throws when API_BASE_URL is not a valid URL', () => {
  const env = { ...VALID_ENV, API_BASE_URL: 'not-a-url' };

  assert.throws(() => createConfig(env), /API_BASE_URL/);
});

test('throws when NODE_ENV is not a recognised environment', () => {
  const env = { ...VALID_ENV, NODE_ENV: 'qa' };

  assert.throws(() => createConfig(env), /NODE_ENV/);
});

test('defaults NODE_ENV to development when absent', () => {
  const env = { ...VALID_ENV, NODE_ENV: undefined };

  assert.equal(createConfig(env).nodeEnv, 'development');
});

test('defaults API_TIMEOUT_MS to 5000 when absent', () => {
  const env = { ...VALID_ENV, API_TIMEOUT_MS: undefined };

  assert.equal(createConfig(env).apiTimeoutMs, 5000);
});

test('throws when API_TIMEOUT_MS is not a positive integer', () => {
  assert.throws(() => createConfig({ ...VALID_ENV, API_TIMEOUT_MS: '0' }), /API_TIMEOUT_MS/);
  assert.throws(() => createConfig({ ...VALID_ENV, API_TIMEOUT_MS: '-1' }), /API_TIMEOUT_MS/);
  assert.throws(() => createConfig({ ...VALID_ENV, API_TIMEOUT_MS: 'soon' }), /API_TIMEOUT_MS/);
});

test('defaults DEV_SERVER_URL to the pinned Vite port when absent', () => {
  const env = { ...VALID_ENV, DEV_SERVER_URL: undefined };

  assert.equal(createConfig(env).devServerUrl, 'http://localhost:5173');
});

test('reports staging and production correctly', () => {
  const staging = createConfig({ ...VALID_ENV, NODE_ENV: 'staging' });
  assert.equal(staging.isStaging, true);
  assert.equal(staging.isDevelopment, false);

  const production = createConfig({ ...VALID_ENV, NODE_ENV: 'production' });
  assert.equal(production.isProduction, true);
  assert.equal(production.isDevelopment, false);
});

test('defaults USE_BUILT_RENDERER to false', () => {
  const env = { ...VALID_ENV, USE_BUILT_RENDERER: undefined };

  assert.equal(createConfig(env).useBuiltRenderer, false);
});

test('reads USE_BUILT_RENDERER when set to true', () => {
  const env = { ...VALID_ENV, USE_BUILT_RENDERER: 'true' };

  assert.equal(createConfig(env).useBuiltRenderer, true);
});

test('throws when USE_BUILT_RENDERER is not a boolean literal', () => {
  assert.throws(() => createConfig({ ...VALID_ENV, USE_BUILT_RENDERER: '1' }), /USE_BUILT_RENDERER/);
  assert.throws(() => createConfig({ ...VALID_ENV, USE_BUILT_RENDERER: 'yes' }), /USE_BUILT_RENDERER/);
});
