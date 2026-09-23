/**
 * @file Catalogue reads that drive the personalisation blocks.
 *
 * The catalogue is an external demo feed, not our database, so `fetch` is
 * stubbed here: these tests are about how the model composes and filters, not
 * about whether a third party is up. The feed is also volatile — an id recorded
 * yesterday may be gone today — so a missing product is covered as an ordinary
 * case rather than a failure.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { ProductModel } from '../src/models/product.model.js';

const realFetch = globalThis.fetch;

/**
 * Build a feed product record in the shape the upstream API returns.
 *
 * @param {number} id - Product id.
 * @param {number} categoryId - Category the product belongs to.
 * @returns {Object} A record shaped like the feed's own.
 */
function feedProduct(id, categoryId) {
  return {
    id,
    title: `Product ${id}`,
    price: id * 10,
    images: [`https://example.test/${id}.jpg`],
    category: { id: categoryId, name: `Category ${categoryId}`, slug: `category-${categoryId}` },
  };
}

beforeEach(() => {
  // The cache outlives any single instance, so a stub from an earlier test
  // would otherwise still be answering here.
  ProductModel.clearCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

test('findByIds returns the products in the order asked for', async () => {
  globalThis.fetch = async (url) => {
    const id = Number(new URL(url).pathname.split('/').pop());
    return { ok: true, status: 200, json: async () => feedProduct(id, 1) };
  };

  const products = await new ProductModel().findByIds([12, 7, 3]);

  assert.deepEqual(products.map((product) => product.id), [12, 7, 3]);
});

test('findByIds returns the shape a product card renders', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => feedProduct(12, 4),
  });

  const [product] = await new ProductModel().findByIds([12]);

  assert.equal(product.id, 12);
  assert.equal(product.name, 'Product 12');
  assert.equal(product.category, 'Category 4');
  assert.equal(product.categoryId, 4);
  assert.equal(product.priceAud, 120);
  assert.equal(product.imageUrl, 'https://example.test/12.jpg');
});

test('findByIds drops a product the feed no longer has', async () => {
  globalThis.fetch = async (url) => {
    const id = Number(new URL(url).pathname.split('/').pop());

    // The feed answers 400 for an unknown id.
    if (id === 7) return { ok: false, status: 400, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => feedProduct(id, 1) };
  };

  const products = await new ProductModel().findByIds([12, 7, 3]);

  assert.deepEqual(products.map((product) => product.id), [12, 3]);
});

test('findByIds survives the feed failing outright', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down');
  };

  // A history that cannot be read is an empty strip, not a broken home page.
  assert.deepEqual(await new ProductModel().findByIds([12, 7]), []);
});

test('findByIds asks for nothing when the history is empty', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => feedProduct(1, 1) };
  };

  assert.deepEqual(await new ProductModel().findByIds([]), []);
  assert.equal(calls, 0);
});

test('findByCategoryExcluding leaves out what the visitor has already seen', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [1, 2, 3, 4, 5, 6].map((id) => feedProduct(id, 9)),
  });

  const products = await new ProductModel().findByCategoryExcluding(9, [1, 3], 3);

  assert.deepEqual(products.map((product) => product.id), [2, 4, 5]);
});

test('findByCategoryExcluding never returns more than the limit', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [1, 2, 3, 4, 5, 6].map((id) => feedProduct(id, 9)),
  });

  const products = await new ProductModel().findByCategoryExcluding(9, [], 2);

  assert.equal(products.length, 2);
});
