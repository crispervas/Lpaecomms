/**
 * @file Single-product API tests.
 *
 * Drives the assembled app with supertest against a stubbed feed. The feed
 * answers 400 for an id it does not know, which the model maps to "not found".
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ProductModel } from '../src/models/product.model.js';

const realFetch = globalThis.fetch;

const FEED_PRODUCT = {
  id: 7,
  title: 'Wireless Keyboard',
  price: 120,
  description: 'Quiet keys.',
  images: ['https://example.test/7a.jpg', 'https://example.test/7b.jpg'],
  category: { id: 2, name: 'Electronics', slug: 'electronics' },
};

/**
 * Replace fetch with a feed stub and record every URL requested.
 *
 * @returns {string[]} The requested URLs.
 */
function stubFeed({ down = false } = {}) {
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (down) return new Response('upstream is down', { status: 503 });
    if (url.endsWith('/products/7')) {
      return new Response(JSON.stringify(FEED_PRODUCT), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'Could not find any entity' }), { status: 400 });
  };
  return requested;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/products/:id returns the product', async () => {
  stubFeed();

  const response = await request(createApp()).get('/api/v1/products/7');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    product: {
      id: 7,
      name: 'Wireless Keyboard',
      category: { id: 2, name: 'Electronics', slug: 'electronics' },
      priceAud: 120,
      description: 'Quiet keys.',
      imageUrls: ['https://example.test/7a.jpg', 'https://example.test/7b.jpg'],
    },
  });
});

test('GET /api/v1/products/:id answers 404 for an id the feed does not know', async () => {
  stubFeed();

  const response = await request(createApp()).get('/api/v1/products/999');

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Product 999 does not exist.');
});

for (const id of ['abc', '0', '1.5', '-1', '99999999999999999999']) {
  test(`GET /api/v1/products/${id} answers 400 without contacting the feed`, async () => {
    const requested = stubFeed();

    const response = await request(createApp()).get(`/api/v1/products/${id}`);

    assert.equal(response.status, 400);
    assert.deepEqual(requested, []);
  });
}

test('GET /api/v1/products/:id answers 502 when the feed fails', async () => {
  stubFeed({ down: true });

  const response = await request(createApp()).get('/api/v1/products/7');

  assert.equal(response.status, 502);
  assert.equal(response.body.message, 'The product catalogue source is unavailable.');
});
