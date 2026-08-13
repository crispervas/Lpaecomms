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
import { CategoryModel } from '../src/models/category.model.js';

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

/**
 * Answer the category list, the emptiness probes, and the product request.
 *
 * @param {number} [count] - How many product records the grid request returns.
 * @returns {void}
 */
const stubCatalogAndCategories = (count = 12) => {
  globalThis.fetch = async (url) => {
    const body = url.endsWith('/categories')
      ? [
          { id: 1, name: 'Clothes', slug: 'clothes' },
          { id: 2, name: 'Electronics', slug: 'electronics' },
        ]
      // `endsWith`, not `includes`: "limit=1" is a prefix of "limit=12", so a
      // substring test would answer the grid's request with a single record.
      : Array.from({ length: url.endsWith('limit=1') ? 1 : count }, (_, i) => ({
          id: i + 1,
          title: `Product ${i + 1}`,
          price: 10,
          images: [`https://example.test/${i + 1}.jpg`],
          category: { id: 2, name: 'Electronics' },
        }));

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
};

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
  CategoryModel.clearCache();
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
  // Unfiltered: "in this category" would be false when no category was
  // ever chosen.
  assert.match(response.text, /No products available yet/);
  // The two states must stay distinguishable: an outage and an empty category
  // look identical from the products array alone.
  assert.doesNotMatch(response.text, /Our catalogue is unavailable right now/);
});

test('an empty result within a chosen category keeps the category-scoped wording', async () => {
  globalThis.fetch = async (url) => {
    const body = url.endsWith('/categories')
      ? [{ id: 2, name: 'Electronics', slug: 'electronics' }]
      // `endsWith`, not `includes`: "limit=1" is a prefix of "limit=12", so a
      // substring test would answer the grid's request with the probe's body.
      : url.endsWith('limit=1')
        ? [{ id: 1 }] // the probe: the category holds products elsewhere
        : []; // the scoped grid request: this slice is empty

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const response = await request(createApp()).get('/catalog?category=electronics');

  assert.equal(response.status, 200);
  assert.match(response.text, /No products in this category yet/);
  assert.doesNotMatch(response.text, /No products available yet/);
});

test('the header offers Catalog and marks it active on the catalog page', async () => {
  stubCatalogFeed(12);

  const response = await request(createApp()).get('/catalog');

  assert.match(response.text, /href="\/catalog"/);
  assert.match(response.text, /border-accent[^"]*"[^>]*>\s*Catalog/);
});

test('the filter bar lists the categories the model returns', async () => {
  stubCatalogAndCategories();

  const response = await request(createApp()).get('/catalog');

  assert.equal(response.status, 200);
  assert.match(response.text, /Product categories/);
  assert.match(response.text, /href="\/catalog\?category=clothes"/);
  assert.match(response.text, /href="\/catalog\?category=electronics"/);
});

test('the unfiltered view marks the All pill as current', async () => {
  stubCatalogAndCategories();

  const response = await request(createApp()).get('/catalog');

  assert.match(response.text, /aria-current="page"[^>]*>\s*All/);
});

test('a category filter changes the heading and scopes the request', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    const body = url.endsWith('/categories')
      ? [{ id: 2, name: 'Electronics', slug: 'electronics' }]
      : [
          {
            id: 5,
            title: 'Wireless Keyboard',
            price: 120,
            images: [],
            category: { id: 2, name: 'Electronics' },
          },
        ];

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const response = await request(createApp()).get('/catalog?category=electronics');

  assert.equal(response.status, 200);
  // The mockup labels the page "All products" even under a filter, which is
  // simply false in that state: the heading follows the filter instead.
  assert.match(response.text, /<h1[^>]*>\s*Electronics/);
  assert.doesNotMatch(response.text, /<h1[^>]*>\s*All products/);
  assert.match(response.text, /<title>Lpaecomms — Electronics<\/title>/);
  // The selection must not be carried by colour alone.
  assert.match(response.text, /aria-current="page"[\s\S]{0,200}?>\s*Electronics/);
  assert.ok(requested.some((url) => url.includes('/categories/2/products?offset=0&limit=12')));
});

test('the grid renders without a filter bar when the category list fails', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) return new Response('upstream is down', { status: 503 });

    return new Response(
      JSON.stringify([
        { id: 1, title: 'Product 1', price: 10, images: [], category: { id: 2, name: 'Electronics' } },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const response = await request(createApp()).get('/catalog');

  // Categories and products are fetched independently: losing one must not
  // take the other down with it.
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /Product categories/);
  assert.match(response.text, /Showing 1 product\b/);
});

test('an unknown category answers 404 without asking the feed for products', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    const body = url.endsWith('/categories')
      ? [{ id: 2, name: 'Electronics', slug: 'electronics' }]
      : [{ id: 1 }];

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const response = await request(createApp()).get('/catalog?category=made-up');

  assert.equal(response.status, 404);
  // The category list is the validator, so no product request is worth making.
  assert.ok(!requested.some((url) => url.includes('limit=12')));
});

test('an unresolvable filter is a feed failure, not a 404', async () => {
  const requested = [];
  // The product endpoint succeeds here — only the category list fails. If the
  // controller called `listByCategory` anyway, this stub would happily answer
  // it, which is exactly what would hide a regressed guard: the stub has to
  // let the product call succeed for skipping it to be an observable choice.
  globalThis.fetch = async (url) => {
    requested.push(url);
    if (url.endsWith('/categories')) return new Response('upstream is down', { status: 503 });

    return new Response(
      JSON.stringify([
        { id: 1, title: 'Product 1', price: 10, images: [], category: { id: 2, name: 'Electronics' } },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const response = await request(createApp()).get('/catalog?category=electronics');

  // With the category list unavailable there is no way to know the slug is
  // wrong. Answering 404 would turn a valid URL dead because a third party
  // was down.
  assert.equal(response.status, 200);
  assert.match(response.text, /Our catalogue is unavailable right now/);
  // `limit=12` is `CATALOG_LIMIT`, which only ever appears on a product
  // request — `limit=1` (the category probe) is a prefix of it, so this must
  // check the full string, not merely that some request happened.
  assert.ok(!requested.some((url) => url.includes('limit=12')));
  assert.doesNotMatch(response.text, /<article/);
});
