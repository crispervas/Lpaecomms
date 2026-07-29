/**
 * @file Product catalogue API tests.
 *
 * Two levels, like the currency conversion suite. The endpoint tests drive the
 * assembled Express app with supertest, with the external catalogue replaced
 * by a stub on `globalThis.fetch`. The caching tests exercise `ProductModel`
 * directly, the same way the equivalent `CurrencyModel` tests do, so they
 * control their own catalogue URL instead of sharing the one the app's route
 * module wires up at import time. `ProductModel.clearCache()` runs after every
 * test — including the endpoint tests, which all resolve to the same
 * production catalogue URL through the app's singleton model — so a cache
 * entry from one test can never answer a different test's stubbed fetch.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ProductModel } from '../src/models/product.model.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

/** Five products in the shape the external feed returns. */
const FEED = [
  { id: 1, title: 'Red Pullover', price: 10, images: ['https://example.test/1.jpg'] },
  { id: 2, title: 'Blue Cap', price: 20, images: ['https://example.test/2.jpg'] },
  { id: 3, title: 'Green Shoes', price: 30, images: ['https://example.test/3.jpg'] },
  { id: 4, title: 'Black Jacket', price: 40, images: ['https://example.test/4.jpg'] },
  { id: 5, title: 'White Shirt', price: 50, images: ['https://example.test/5.jpg'] },
];

afterEach(() => {
  globalThis.fetch = realFetch;
  // Every test in this file resolves to a cached entry keyed by whatever
  // catalogue URL it used; clearing between tests is what lets each one's
  // fetch stub actually run instead of a previous test's cached result.
  ProductModel.clearCache();
});

// The app imports the shared Prisma client, which builds a connection pool at
// import time. Closing it lets the test process exit instead of hanging.
after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/products returns five products, each with a store location', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(FEED), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const response = await request(createApp()).get('/api/v1/products');

  assert.equal(response.status, 200);
  assert.equal(response.body.products.length, 5);

  for (const product of response.body.products) {
    assert.equal(typeof product.name, 'string');
    assert.equal(typeof product.priceAud, 'number');
    assert.equal(typeof product.store, 'string');
    assert.equal(typeof product.latitude, 'number');
    assert.equal(typeof product.longitude, 'number');
  }

  assert.deepEqual(response.body.products[0], {
    id: 1,
    name: 'Red Pullover',
    priceAud: 10,
    imageUrl: 'https://example.test/1.jpg',
    store: 'Surfers Paradise',
    latitude: -28.0023,
    longitude: 153.4145,
  });
});

test('GET /api/v1/products answers 502 when the catalogue source fails', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const response = await request(createApp()).get('/api/v1/products');

  assert.equal(response.status, 502);
});

test('GET /api/v1/products extracts an image URL from every shape the feed uses', async () => {
  const feed = [
    {
      id: 1,
      title: 'Single JSON String',
      price: 10,
      images: '["https://example.test/single.jpg"]',
    },
    {
      id: 2,
      title: 'Multi JSON String',
      price: 20,
      images: '["https://example.test/first.jpg","https://example.test/second.jpg"]',
    },
    { id: 3, title: 'Bare String', price: 30, images: 'https://example.test/bare.jpg' },
  ];

  globalThis.fetch = async () =>
    new Response(JSON.stringify(feed), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const response = await request(createApp()).get('/api/v1/products');

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.products.map((product) => product.imageUrl),
    [
      // Single-element JSON string: parsing must return the URL itself, not
      // a string still wrapped in brackets and quotes.
      'https://example.test/single.jpg',
      // Multi-element JSON string: the regression case. Bracket-stripping
      // corrupted this by leaving the second URL appended to the first.
      'https://example.test/first.jpg',
      // Neither an array nor a JSON-encoded one: the fallback path.
      'https://example.test/bare.jpg',
    ],
  );
});

test('GET /api/v1/products carries the CORS header on both a success and a failure', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(FEED), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const app = createApp();
  const success = await request(app).get('/api/v1/products');
  assert.equal(success.status, 200);
  assert.equal(success.headers['access-control-allow-origin'], '*');

  // Without clearing the cache here, this second call would be served from
  // the entry the first call just wrote and never reach the failing stub
  // below — defeating the point of proving the header on a failure too.
  ProductModel.clearCache();
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const failure = await request(app).get('/api/v1/products');
  assert.equal(failure.status, 502);
  assert.equal(failure.headers['access-control-allow-origin'], '*');
});

test('ProductModel fetches once, then serves a second call from cache', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify(FEED), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  // A URL unique to this test, so its cache entry can never be read by — or
  // read from — any other test in this file, even without clearCache().
  const model = new ProductModel('https://example.test/cache-hit');

  const first = await model.listWithLocations();
  assert.equal(first.length, 5);

  const second = await model.listWithLocations();
  assert.deepEqual(second, first);
  assert.equal(upstreamCalls, 1);
});

test('ProductModel does not cache a failed fetch', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response('upstream is down', { status: 503 });
  };

  const model = new ProductModel('https://example.test/cache-miss');

  await assert.rejects(() => model.listWithLocations());
  assert.equal(upstreamCalls, 1);

  // The part that matters: a failed fetch must never be cached. If it had
  // been written despite the throw, this second call would resolve instead of
  // rejecting and upstreamCalls would stay at 1.
  await assert.rejects(() => model.listWithLocations());
  assert.equal(upstreamCalls, 2);
});
