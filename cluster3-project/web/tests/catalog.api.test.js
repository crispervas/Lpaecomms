/**
 * @file Paged catalogue API tests.
 *
 * Drives the assembled app with supertest against a stubbed feed that honours
 * offset and limit, so paging and `hasMore` are exercised end to end. Both
 * model caches outlive a request and are cleared after every test.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ProductModel } from '../src/models/product.model.js';
import { CategoryModel } from '../src/models/category.model.js';

const realFetch = globalThis.fetch;

const json = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const down = () => new Response('upstream is down', { status: 503 });

/** `count` products in the feed's shape, ids 1..count. */
const makeFeed = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Product ${i + 1}`,
    price: 10 * (i + 1),
    images: [`https://example.test/${i + 1}.jpg`],
    category: { id: 1, name: 'Clothes', slug: 'clothes' },
  }));

const CLOTHES = { id: 1, name: 'Clothes', slug: 'clothes', image: 'https://example.test/c.jpg' };

/**
 * Replace fetch with a feed stub and record every URL requested.
 *
 * @returns {string[]} The requested URLs, in order.
 */
function stubFeed({ products = makeFeed(30), productsDown = false, categoriesDown = false } = {}) {
  const requested = [];
  globalThis.fetch = async (input) => {
    const raw = String(input);
    requested.push(raw);
    const url = new URL(raw);

    // The category list, and CategoryModel's probes composed onto it.
    if (url.pathname.endsWith('/categories')) {
      return categoriesDown ? down() : json([CLOTHES]);
    }

    if (productsDown) return down();

    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    return json(products.slice(offset, offset + limit));
  };
  return requested;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
  CategoryModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/catalog returns the first page with hasMore', async () => {
  const requested = stubFeed();

  const response = await request(createApp()).get('/api/v1/catalog');

  assert.equal(response.status, 200);
  assert.equal(response.body.products.length, 12);
  assert.equal(response.body.offset, 0);
  assert.equal(response.body.limit, 12);
  assert.equal(response.body.hasMore, true);
  assert.deepEqual(response.body.products[0], {
    id: 1,
    name: 'Product 1',
    category: 'Clothes',
    priceAud: 10,
    imageUrl: 'https://example.test/1.jpg',
  });
  // One extra product is requested to learn whether another page exists.
  assert.ok(requested.some((url) => url.endsWith('/products?offset=0&limit=13')));
});

test('GET /api/v1/catalog reports no more pages at the end of the feed', async () => {
  stubFeed();

  const response = await request(createApp()).get('/api/v1/catalog?offset=24&limit=6');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.products.map((p) => p.id), [25, 26, 27, 28, 29, 30]);
  assert.equal(response.body.hasMore, false);
});

test('GET /api/v1/catalog scopes to a category slug', async () => {
  const requested = stubFeed();

  const response = await request(createApp()).get('/api/v1/catalog?category=clothes&offset=6&limit=6');

  assert.equal(response.status, 200);
  assert.ok(requested.some((url) => url.endsWith('/categories/1/products?offset=6&limit=7')));
});

test('GET /api/v1/catalog answers 404 for an unknown category', async () => {
  stubFeed();

  const response = await request(createApp()).get('/api/v1/catalog?category=nope');

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Category "nope" does not exist.');
});

for (const query of [
  'limit=0',
  'limit=25',
  'limit=abc',
  'limit=1e3',
  'offset=-1',
  'offset=1.5',
  'offset=10001',
  'category=',
  'category=a&category=b',
]) {
  test(`GET /api/v1/catalog answers 400 for ${query}`, async () => {
    const requested = stubFeed();

    const response = await request(createApp()).get(`/api/v1/catalog?${query}`);

    assert.equal(response.status, 400);
    // A rejected request must never reach the feed.
    assert.deepEqual(requested, []);
  });
}

test('GET /api/v1/catalog answers 502 when the product feed fails', async () => {
  stubFeed({ productsDown: true });

  const response = await request(createApp()).get('/api/v1/catalog');

  assert.equal(response.status, 502);
  assert.equal(response.body.message, 'The product catalogue source is unavailable.');
});

test('GET /api/v1/catalog answers 502 for a category when the category list fails', async () => {
  stubFeed({ categoriesDown: true });

  const filtered = await request(createApp()).get('/api/v1/catalog?category=clothes');
  const unfiltered = await request(createApp()).get('/api/v1/catalog');

  assert.equal(filtered.status, 502);
  // Without a filter the category list is not needed at all.
  assert.equal(unfiltered.status, 200);
});
