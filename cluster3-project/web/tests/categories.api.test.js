/**
 * @file Category list API tests.
 *
 * Drives the assembled app with supertest, with the external feed replaced by
 * a stub on `globalThis.fetch`. The category cache outlives any one request,
 * so it is cleared after every test.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { CategoryModel } from '../src/models/category.model.js';

const realFetch = globalThis.fetch;

/** A 200 JSON response carrying `body`. */
const json = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  globalThis.fetch = realFetch;
  CategoryModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/categories returns the categories that hold products', async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/categories') && !url.search.includes('/products')) {
      return json([
        { id: 1, name: 'Clothes', slug: 'clothes', image: 'https://example.test/c.jpg' },
        { id: 6, name: 'Junk', slug: 'junk', image: 'https://example.test/j.jpg' },
      ]);
    }
    // Probe for one category's products: category 6 is empty.
    return json(String(input).includes('/6/products') ? [] : [{ id: 10 }]);
  };

  const response = await request(createApp()).get('/api/v1/categories');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { categories: [{ id: 1, name: 'Clothes', slug: 'clothes' }] });
});

test('GET /api/v1/categories answers 502 when the category source fails', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const response = await request(createApp()).get('/api/v1/categories');

  assert.equal(response.status, 502);
  assert.equal(response.body.message, 'The category source is unavailable.');
});
