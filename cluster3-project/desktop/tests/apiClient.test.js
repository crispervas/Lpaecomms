/**
 * @file Tests for the REST API client's result envelope.
 *
 * fetch is injected, so every failure mode is reachable without a running
 * server. The 503 case matters most: it is the one a later refactor is most
 * likely to collapse into a generic error.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createApiClient } = require('../src/main/services/apiClient.js');

const BASE_URL = 'http://localhost:3000/api/v1';

/**
 * Build a fetch stub that resolves with the given status and body.
 *
 * @param {number} status - HTTP status code to report.
 * @param {unknown} body - Value the response's json() resolves to.
 * @returns {Function} A fetch-compatible stub.
 */
function respondWith(status, body) {
  return async () => ({
    status,
    async json() {
      return body;
    },
  });
}

/**
 * Build a fetch stub that rejects with a named error.
 *
 * @param {string} name - Error name, e.g. 'TimeoutError'.
 * @param {string} message - Error message.
 * @returns {Function} A fetch-compatible stub.
 */
function rejectWith(name, message) {
  return async () => {
    const error = new Error(message);
    error.name = name;
    throw error;
  };
}

/**
 * Create a client with sane defaults and an injected fetch.
 *
 * @param {Function} fetchImpl - Stubbed fetch.
 * @returns {{getHealth: Function}} The client under test.
 */
function clientWith(fetchImpl) {
  return createApiClient({ fetchImpl, baseUrl: BASE_URL, timeoutMs: 5000 });
}

test('maps a healthy 200 response', async () => {
  const client = clientWith(respondWith(200, { status: 'ok', db: 'connected' }));

  const envelope = await client.getHealth();

  assert.deepEqual(envelope, {
    ok: true,
    status: 200,
    data: { status: 'ok', db: 'connected' },
    error: null,
  });
});

test('maps a degraded 503 response as a reply, not a failure', async () => {
  const client = clientWith(respondWith(503, { status: 'degraded', db: 'unreachable' }));

  const envelope = await client.getHealth();

  assert.equal(envelope.ok, true, 'a 503 is still an answer from the server');
  assert.equal(envelope.status, 503);
  assert.deepEqual(envelope.data, { status: 'degraded', db: 'unreachable' });
  assert.equal(envelope.error, null);
});

test('maps a refused connection to an unreachable envelope', async () => {
  const client = clientWith(rejectWith('TypeError', 'fetch failed'));

  const envelope = await client.getHealth();

  assert.equal(envelope.ok, false);
  assert.equal(envelope.status, null);
  assert.equal(envelope.data, null);
  assert.match(envelope.error, /Cannot reach the API/);
  assert.match(envelope.error, /localhost:3000/);
});

test('maps a timeout to a timeout envelope naming the limit', async () => {
  const client = clientWith(rejectWith('TimeoutError', 'The operation was aborted'));

  const envelope = await client.getHealth();

  assert.equal(envelope.ok, false);
  assert.equal(envelope.status, null);
  assert.match(envelope.error, /did not respond within 5000 ms/);
});

test('reports a response whose body is not JSON', async () => {
  const client = clientWith(async () => ({
    status: 200,
    async json() {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  }));

  const envelope = await client.getHealth();

  assert.equal(envelope.ok, true, 'the server did respond');
  assert.equal(envelope.status, 200);
  assert.equal(envelope.data, null);
  assert.match(envelope.error, /not valid JSON/);
});

test('requests the health path under the configured base URL', async () => {
  let requestedUrl = null;
  const client = clientWith(async (url) => {
    requestedUrl = url;
    return { status: 200, async json() { return { status: 'ok', db: 'connected' }; } };
  });

  await client.getHealth();

  assert.equal(requestedUrl, 'http://localhost:3000/api/v1/health');
});

test('never rejects, whatever fetch does', async () => {
  const client = clientWith(async () => {
    throw new Error('something entirely unexpected');
  });

  const envelope = await client.getHealth();

  assert.equal(envelope.ok, false);
  assert.equal(typeof envelope.error, 'string');
});
