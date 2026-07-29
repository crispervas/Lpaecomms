/**
 * @file Currency conversion API tests.
 *
 * Two levels, for two different reasons. The endpoint tests drive the app with
 * supertest and stub `globalThis.fetch` in place of API Ninjas. The
 * missing-key test cannot go through the app at all: `config` is frozen when
 * env.js is imported, so the running app always has whatever key the
 * environment gave it. That case builds the controller directly with a
 * key-less model — which is why the key is injected through the constructor
 * rather than read from `config` inside the model.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { CurrencyModel } from '../src/models/currency.model.js';
import { CurrencyController } from '../src/controllers/currency.controller.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/convert rejects a currency outside the whitelist', async () => {
  const response = await request(createApp()).get('/api/v1/convert?have=AUD&want=JPY&amount=10');

  assert.equal(response.status, 400);
});

test('GET /api/v1/convert rejects a non-positive amount', async () => {
  const response = await request(createApp()).get('/api/v1/convert?have=AUD&want=USD&amount=0');

  assert.equal(response.status, 400);
});

test('CurrencyController answers 503 when no API key is configured', async () => {
  const controller = new CurrencyController(new CurrencyModel(null));

  let forwarded;
  await controller.convert(
    { query: { have: 'AUD', want: 'USD', amount: '10' } },
    { json() {} },
    (error) => {
      forwarded = error;
    },
  );

  assert.equal(forwarded.output.statusCode, 503);
});

// Both 400 tests above prove nothing about ordering by themselves: with no key
// in this environment, a controller that checked configuration first would
// also land on 503 before validation ever ran... except it wouldn't, because
// there's no key to trip that check — the 400 would still come out, just for
// the wrong reason. This test uses a *configured* model, so if validation ever
// moved after the configuration check, this would start failing (a 503 instead
// of 400) even though the two 400 tests above kept passing.
test('CurrencyController validates before checking configuration, even with a key present', async () => {
  globalThis.fetch = async () => {
    throw new Error('upstream must not be called before validation passes');
  };

  const controller = new CurrencyController(new CurrencyModel('test-key'));

  let forwarded;
  await controller.convert(
    { query: { have: 'AUD', want: 'JPY', amount: '10' } },
    { json() {} },
    (error) => {
      forwarded = error;
    },
  );

  assert.equal(forwarded.output.statusCode, 400);
});

// Driven directly against the controller, the same way the 503 test above is,
// rather than through supertest + createApp(): the running app's currency
// route wires in config.ninjaApiKey at import time, and this environment has
// no NINJA_API_KEY, so an app-level request would hit the 503 branch before
// ever reaching the provider call this test needs to exercise. Constructing
// the controller with a configured model reaches the same convert() code path
// the app would use once a real key is present, without inventing one.
test('CurrencyController answers 502 with a generic message when the provider fails', async () => {
  globalThis.fetch = async () => new Response('Forbidden: invalid API key', { status: 403 });

  const controller = new CurrencyController(new CurrencyModel('test-key'));

  let forwarded;
  await controller.convert(
    { query: { have: 'AUD', want: 'USD', amount: '10' } },
    { json() {} },
    (error) => {
      forwarded = error;
    },
  );

  assert.equal(forwarded.output.statusCode, 502);
  // The security property this proxy exists for: the client-facing message is
  // exactly the generic string, never the provider's status or body text (both
  // of which could reveal that the key itself is the problem).
  assert.equal(forwarded.output.payload.message, 'The currency provider is unavailable.');
  assert.ok(!forwarded.output.payload.message.includes('403'));
  assert.ok(!forwarded.output.payload.message.includes('Forbidden'));
});

test('CurrencyModel converts, then serves the second call from cache', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ new_amount: 6.59, new_currency: 'USD' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new CurrencyModel('test-key');

  const first = await model.convert('AUD', 'USD', 10);
  assert.equal(first.cached, false);
  assert.equal(first.converted, 6.59);
  assert.equal(first.rate, 0.659);

  const second = await model.convert('AUD', 'USD', 20);
  assert.equal(second.cached, true);
  assert.equal(second.converted, 13.18);
  assert.equal(upstreamCalls, 1);
});

test('CurrencyModel rejects a zero converted amount and caches nothing', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ new_amount: 0, new_currency: 'USD' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new CurrencyModel('test-key');

  await assert.rejects(() => model.convert('AUD', 'USD', 10));
  assert.equal(upstreamCalls, 1);

  // The part that matters: a zero rate must never reach the cache. If it had
  // been written despite the throw, this second call would resolve instead of
  // rejecting and upstreamCalls would stay at 1.
  await assert.rejects(() => model.convert('AUD', 'USD', 10));
  assert.equal(upstreamCalls, 2);
});

test('CurrencyModel converts a currency into itself without calling upstream', async () => {
  globalThis.fetch = async () => {
    throw new Error('upstream must not be called for an identity conversion');
  };

  const result = await new CurrencyModel('test-key').convert('AUD', 'AUD', 42);

  assert.deepEqual(result, { rate: 1, converted: 42, cached: true });
});
