/**
 * @file Catalog page view tests.
 *
 * Every test that drives `GET /catalog` stubs `globalThis.fetch`: the route
 * wires its own model against the production feed, and no test may reach it.
 * The shared `afterEach` also clears the model cache, so one test's stubbed
 * response can never answer the next test's request.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ProductModel } from '../src/models/product.model.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

/**
 * Answer any product request with `count` records, in the shape the feed
 * returns.
 *
 * @param {number} [count] - How many feed records to generate.
 * @returns {void}
 */
const stubCatalogFeed = (count = 12) => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify(
        Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          title: `Product ${i + 1}`,
          price: 10,
          images: [`https://example.test/${i + 1}.jpg`],
          category: { id: 2, name: 'Electronics' },
        })),
      ),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
};

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('the catalog renders its heading and a full grid', async () => {
  stubCatalogFeed(12);

  const response = await request(createApp()).get('/catalog');

  assert.equal(response.status, 200);
  assert.match(response.text, /Full catalog/);
  assert.match(response.text, /All products/);
  assert.match(response.text, /Product 12/);
  assert.equal(response.text.match(/<article/g).length, 12);
});

test('the catalog labels how many products it is showing', async () => {
  stubCatalogFeed(12);

  const response = await request(createApp()).get('/catalog');

  assert.match(response.text, /Showing 12 products/);
});

test('the label reads singular for a single product', async () => {
  stubCatalogFeed(1);

  const response = await request(createApp()).get('/catalog');

  assert.match(response.text, /Showing 1 product\b/);
  assert.doesNotMatch(response.text, /Showing 1 products/);
});

test('the catalog shows the unavailable notice when the feed fails', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const response = await request(createApp()).get('/catalog');

  // A third-party outage is not a reason for the page itself to fail.
  assert.equal(response.status, 200);
  assert.match(response.text, /Our catalogue is unavailable right now/);
  assert.doesNotMatch(response.text, /<article/);
  assert.doesNotMatch(response.text, /Showing/);
});

test('an empty catalogue reads as empty, not as a failure', async () => {
  stubCatalogFeed(0);

  const response = await request(createApp()).get('/catalog');

  assert.equal(response.status, 200);
  assert.match(response.text, /No products in this category yet/);
  // The two states must stay distinguishable: an outage and an empty category
  // look identical from the products array alone.
  assert.doesNotMatch(response.text, /Our catalogue is unavailable right now/);
});

test('the header offers Catalog and marks it active on the catalog page', async () => {
  stubCatalogFeed(12);

  const response = await request(createApp()).get('/catalog');

  assert.match(response.text, /href="\/catalog"/);
  assert.match(response.text, /border-accent[^"]*"[^>]*>\s*Catalog/);
});
