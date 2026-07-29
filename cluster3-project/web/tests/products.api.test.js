/**
 * @file Product catalogue API tests.
 *
 * Drives the assembled Express app with supertest. The external catalogue is
 * replaced by a stub on `globalThis.fetch` for the duration of each test, so
 * the suite is deterministic and never depends on a third-party service being
 * up. The real fetch is restored afterwards.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

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
  assert.equal(response.body.length, 5);

  for (const product of response.body) {
    assert.equal(typeof product.name, 'string');
    assert.equal(typeof product.priceAud, 'number');
    assert.equal(typeof product.store, 'string');
    assert.equal(typeof product.latitude, 'number');
    assert.equal(typeof product.longitude, 'number');
  }

  assert.deepEqual(response.body[0], {
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
    response.body.map((product) => product.imageUrl),
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
