/**
 * @file CategoryModel tests.
 *
 * The demo feed accepts writes from anyone, so `/categories` accumulates
 * categories created by strangers. These tests pin the rule that keeps them out
 * of the storefront's filter bar — and the deliberate exception to it: a
 * category whose probe fails is kept, because dropping a legitimate category
 * over one failed request would silently shrink the catalog's navigation.
 *
 * Each test uses its own base URL so no test can read or evict another's cache
 * entry, the same way the ProductModel tests do.
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { CategoryModel } from '../src/models/category.model.js';

const realFetch = globalThis.fetch;

/** A category record in the shape the feed returns. */
const feedCategory = (id, slug) => ({
  id,
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
  slug,
  image: `https://example.test/${slug}.jpg`,
});

/** A JSON response carrying `body`. */
const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  globalThis.fetch = realFetch;
  CategoryModel.clearCache();
});

test('listCategories returns only categories that have products', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) {
      return jsonResponse([feedCategory(1, 'clothes'), feedCategory(6, 'testing-category')]);
    }
    // Category 6 is the junk one: it exists but holds nothing.
    return jsonResponse(url.includes('/6/products') ? [] : [{ id: 10 }]);
  };

  const categories = await new CategoryModel('https://example.test/only-populated/categories').listCategories();

  assert.deepEqual(categories, [{ id: 1, name: 'Clothes', slug: 'clothes' }]);
});

test('listCategories keeps a category whose probe rejects', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) return jsonResponse([feedCategory(1, 'clothes')]);
    throw new Error('network down');
  };

  const categories = await new CategoryModel('https://example.test/probe-rejects/categories').listCategories();

  // Fail open: a blip must not remove a real category from the filter bar.
  assert.equal(categories.length, 1);
  assert.equal(categories[0].slug, 'clothes');
});

test('listCategories keeps a category whose probe answers non-2xx', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) return jsonResponse([feedCategory(1, 'clothes')]);
    return new Response('upstream is down', { status: 503 });
  };

  const categories = await new CategoryModel('https://example.test/probe-503/categories').listCategories();

  assert.equal(categories.length, 1);
});

test('listCategories keeps a category whose probe answers with a malformed body', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) return jsonResponse([feedCategory(1, 'clothes')]);
    // A 200 that is not the array the feed is supposed to send back — this
    // must not be read as a successful "no products" answer.
    return jsonResponse({ error: 'not an array' });
  };

  const categories = await new CategoryModel('https://example.test/probe-malformed/categories').listCategories();

  assert.equal(categories.length, 1);
});

test('listCategories probes each category once, with limit 1', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    if (url.endsWith('/categories')) {
      return jsonResponse([feedCategory(1, 'clothes'), feedCategory(2, 'electronics')]);
    }
    return jsonResponse([{ id: 10 }]);
  };

  await new CategoryModel('https://example.test/probe-shape/categories').listCategories();

  // One list request plus one probe per category, and the probe asks for a
  // single record because its only question is "any at all?".
  assert.equal(requested.length, 3);
  assert.ok(requested.some((url) => url === 'https://example.test/probe-shape/categories/1/products?offset=0&limit=1'));
  assert.ok(requested.some((url) => url === 'https://example.test/probe-shape/categories/2/products?offset=0&limit=1'));
});

test('listCategories probes no more than the category cap', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    if (url.endsWith('/categories')) {
      // More categories than the model is willing to probe in one call.
      return jsonResponse(Array.from({ length: 25 }, (_, i) => feedCategory(i + 1, `category-${i + 1}`)));
    }
    return jsonResponse([{ id: 10 }]);
  };

  await new CategoryModel('https://example.test/probe-cap/categories').listCategories();

  const probeRequests = requested.filter((url) => url.includes('/products?offset=0&limit=1'));

  // The feed offered 25 categories; the cap keeps a runaway list from firing
  // a probe per entry.
  assert.ok(probeRequests.length <= 20, `expected at most 20 probes, got ${probeRequests.length}`);
});

test('listCategories serves a second call from cache', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async (url) => {
    upstreamCalls += 1;
    if (url.endsWith('/categories')) return jsonResponse([feedCategory(1, 'clothes')]);
    return jsonResponse([{ id: 10 }]);
  };

  const model = new CategoryModel('https://example.test/cached/categories');

  const first = await model.listCategories();
  const second = await model.listCategories();

  assert.deepEqual(second, first);
  assert.equal(upstreamCalls, 2, 'the list plus one probe, and nothing on the second call');
});

test('listCategories returns a fresh array each call, not the cache\'s own', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/categories')) return jsonResponse([feedCategory(1, 'clothes')]);
    return jsonResponse([{ id: 10 }]);
  };

  const model = new CategoryModel('https://example.test/copy-on-read/categories');

  await model.listCategories();
  const second = await model.listCategories(); // served from cache
  second.push(feedCategory(99, 'planted'));

  const third = await model.listCategories();

  // Mutating what a cache hit handed back must never corrupt what the next
  // caller receives within the same TTL window.
  assert.equal(third.length, 1);
});

test('listCategories throws when the category list cannot be read', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const model = new CategoryModel('https://example.test/list-fails/categories');

  await assert.rejects(() => model.listCategories());

  // A failed list is never cached, so a later call tries again rather than
  // serving an empty filter bar for the whole TTL.
  await assert.rejects(() => model.listCategories());
});
