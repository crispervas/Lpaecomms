/**
 * @file ProductModel tests for the home page's featured catalogue.
 *
 * These drive the model directly with a per-test base URL, the way the existing
 * caching tests do, so no test can read or evict another's cache entry. The
 * isolation test is the point of the whole file: the home page and the mashup
 * endpoint read the same feed at different sizes, and before the raw-JSON cache
 * refactor a single URL key held one already-transformed shape that the other
 * caller would have silently received.
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { ProductModel } from '../src/models/product.model.js';

const realFetch = globalThis.fetch;

/** Feed records in the shape the external catalogue returns. */
const feedRecord = (id) => ({
  id,
  title: `Product ${id}`,
  price: id * 10,
  images: [`https://example.test/${id}.jpg`],
  category: { id: 1, name: 'Keyboards' },
});

/** Answer any fetch with `count` feed records. */
const stubFeed = (count) => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(Array.from({ length: count }, (_, i) => feedRecord(i + 1))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
};

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

test('listFeatured maps every field the home page renders', async () => {
  stubFeed(8);

  const products = await new ProductModel('https://example.test/featured-map').listFeatured();

  assert.equal(products.length, 8);
  assert.deepEqual(products[0], {
    id: 1,
    name: 'Product 1',
    category: 'Keyboards',
    priceAud: 10,
    imageUrl: 'https://example.test/1.jpg',
  });
});

test('listFeatured falls back to an empty category when the feed omits one', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: 1, title: 'No Category', price: 5, images: [] }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const products = await new ProductModel('https://example.test/featured-nocat').listFeatured(1);

  // An empty string, never undefined: the card drops the line rather than
  // printing "undefined" above the product name.
  assert.equal(products[0].category, '');
});

test('listFeatured never returns more than the requested limit', async () => {
  stubFeed(20);

  const products = await new ProductModel('https://example.test/featured-limit').listFeatured(4);

  assert.equal(products.length, 4);
});

test('listFeatured carries no store location', async () => {
  stubFeed(8);

  const products = await new ProductModel('https://example.test/featured-nostore').listFeatured();

  assert.equal(products[0].store, undefined);
  assert.equal(products[0].latitude, undefined);
});

test('listFeatured and listWithLocations do not evict each other', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify(Array.from({ length: 8 }, (_, i) => feedRecord(i + 1))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new ProductModel('https://example.test/isolation');

  const featured = await model.listFeatured(8);
  const located = await model.listWithLocations();
  assert.equal(upstreamCalls, 2, 'two different sizes are two different upstream URLs');

  // Both are cached under their own URL, so neither second call reaches the feed
  // and neither result is the other's shape.
  assert.deepEqual(await model.listFeatured(8), featured);
  assert.deepEqual(await model.listWithLocations(), located);
  assert.equal(upstreamCalls, 2);
  assert.equal(featured.length, 8);
  assert.equal(located.length, 5);
  assert.equal(located[0].store, 'Surfers Paradise');
});

test('listFeatured does not cache a failed fetch', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response('upstream is down', { status: 503 });
  };

  const model = new ProductModel('https://example.test/featured-failure');

  await assert.rejects(() => model.listFeatured());
  await assert.rejects(() => model.listFeatured());
  assert.equal(upstreamCalls, 2);
});
