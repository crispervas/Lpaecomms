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

test('listByCategory requests the category resource and maps every field', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return new Response(
      JSON.stringify([
        {
          id: 7,
          title: 'Wireless Keyboard',
          price: 120,
          images: ['https://example.test/7.jpg'],
          category: { id: 2, name: 'Electronics' },
        },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const model = new ProductModel(
    'https://example.test/by-category/products',
    'https://example.test/by-category/categories',
  );

  const products = await model.listByCategory(2, 12);

  assert.equal(requested[0], 'https://example.test/by-category/categories/2/products?offset=0&limit=12');
  assert.deepEqual(products[0], {
    id: 7,
    name: 'Wireless Keyboard',
    category: 'Electronics',
    priceAud: 120,
    imageUrl: 'https://example.test/7.jpg',
  });
});

test('listByCategory with a null category reads the unfiltered products URL', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new ProductModel(
    'https://example.test/null-category/products',
    'https://example.test/null-category/categories',
  );

  await model.listByCategory(null, 12);

  assert.equal(requested[0], 'https://example.test/null-category/products?offset=0&limit=12');
});

test('two categories do not evict each other', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async (url) => {
    upstreamCalls += 1;
    const id = url.includes('/categories/2/') ? 2 : 3;
    return new Response(
      JSON.stringify([
        { id, title: `Product ${id}`, price: 10, images: [], category: { id, name: `Category ${id}` } },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const model = new ProductModel(
    'https://example.test/isolation-cat/products',
    'https://example.test/isolation-cat/categories',
  );

  const two = await model.listByCategory(2, 12);
  const three = await model.listByCategory(3, 12);
  assert.equal(upstreamCalls, 2);

  // Each category is its own URL and therefore its own cache entry: neither
  // second call reaches the feed, and neither returns the other's products.
  assert.deepEqual(await model.listByCategory(2, 12), two);
  assert.deepEqual(await model.listByCategory(3, 12), three);
  assert.equal(upstreamCalls, 2);
  assert.equal(two[0].name, 'Product 2');
  assert.equal(three[0].name, 'Product 3');
});

test('listFeatured still defaults to eight and reads the unfiltered URL', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new ProductModel(
    'https://example.test/featured-default/products',
    'https://example.test/featured-default/categories',
  );

  await model.listFeatured();

  // The home's trending row is eight and the catalog's grid is twelve: the
  // delegation must not hand the home page the catalog's default.
  assert.equal(requested[0], 'https://example.test/featured-default/products?offset=0&limit=8');
});

test('a non-2xx feed response carries its status on the error', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const model = new ProductModel(
    'https://example.test/error-status/products',
    'https://example.test/error-status/categories',
  );

  await assert.rejects(
    () => model.listFeatured(),
    (error) => {
      // The status travels as data, not inside the message: getById tells a
      // product that does not exist from a feed that could not be read by
      // reading this, and a reworded message must not break that.
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test('a malformed JSON-encoded array still surfaces the real URL inside it', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { id: 1, title: 'Product 1', price: 10, images: '[42, "https://example.test/real.jpg"]' },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const model = new ProductModel('https://example.test/malformed-array');

  const products = await model.listFeatured();

  // The old parser fell through to the raw encoded string here — an <img src>
  // that could never render. Filtering for strings surfaces the real URL
  // instead; pinned so this improvement cannot be "fixed" back by accident.
  assert.equal(products[0].imageUrl, 'https://example.test/real.jpg');
});

test('a JSON-encoded empty array yields no image URL', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: 1, title: 'Product 1', price: 10, images: '[]' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const model = new ProductModel('https://example.test/empty-encoded-array');

  const products = await model.listFeatured();

  assert.equal(products[0].imageUrl, '');
});

test('a JSON-encoded array nested inside a real array still resolves', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { id: 1, title: 'Product 1', price: 10, images: ['["https://example.test/nested.jpg"]'] },
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const model = new ProductModel('https://example.test/nested-encoded-array');

  const products = await model.listFeatured();

  assert.equal(products[0].imageUrl, 'https://example.test/nested.jpg');
});

/** One product record in the shape the feed's single-product endpoint returns. */
const feedProduct = () => ({
  id: 7,
  title: 'Wireless Keyboard',
  slug: 'wireless-keyboard',
  price: 120,
  description: 'A keyboard, wirelessly.',
  category: { id: 2, name: 'Electronics', slug: 'electronics' },
  images: ['https://example.test/a.jpg', 'https://example.test/b.jpg'],
});

test('getById maps every field the detail page renders', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return new Response(JSON.stringify(feedProduct()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const model = new ProductModel(
    'https://example.test/by-id/products',
    'https://example.test/by-id/categories',
  );

  const product = await model.getById(7);

  assert.equal(requested[0], 'https://example.test/by-id/products/7');
  assert.deepEqual(product, {
    id: 7,
    name: 'Wireless Keyboard',
    category: { id: 2, name: 'Electronics', slug: 'electronics' },
    priceAud: 120,
    description: 'A keyboard, wirelessly.',
    // Every image, not just the first: the gallery shows the rest.
    imageUrls: ['https://example.test/a.jpg', 'https://example.test/b.jpg'],
  });
});

test('getById returns null when the feed says the product does not exist', async () => {
  // The feed answers 400 for an unknown id rather than the conventional 404.
  globalThis.fetch = async () => new Response('no such product', { status: 400 });

  const model = new ProductModel(
    'https://example.test/missing-400/products',
    'https://example.test/missing-400/categories',
  );

  assert.equal(await model.getById(999), null);
});

test('getById treats a 404 as "does not exist" too', async () => {
  // Accepted alongside 400 so a future service using the conventional status
  // needs no change here.
  globalThis.fetch = async () => new Response('no such product', { status: 404 });

  const model = new ProductModel(
    'https://example.test/missing-404/products',
    'https://example.test/missing-404/categories',
  );

  assert.equal(await model.getById(999), null);
});

test('getById throws when the feed could not be read', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const model = new ProductModel(
    'https://example.test/unreadable/products',
    'https://example.test/unreadable/categories',
  );

  // A missing product and an unreadable feed are different answers, and the
  // page shows a different thing for each.
  await assert.rejects(() => model.getById(1));
});

test('getById does not cache a product that does not exist', async () => {
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response('no such product', { status: 400 });
  };

  const model = new ProductModel(
    'https://example.test/missing-uncached/products',
    'https://example.test/missing-uncached/categories',
  );

  assert.equal(await model.getById(999), null);
  assert.equal(await model.getById(999), null);
  // The answer changes the moment someone creates it, so a five-minute memory
  // of an absence is not worth holding.
  assert.equal(upstreamCalls, 2);
});

test('getById falls back when the feed omits a category or a description', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 3, title: 'Bare', price: 10, images: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  const model = new ProductModel(
    'https://example.test/bare/products',
    'https://example.test/bare/categories',
  );

  const product = await model.getById(3);

  // Empty strings rather than undefined: the badge, the breadcrumb and the
  // description omit their line instead of printing "undefined".
  assert.deepEqual(product.category, { id: null, name: '', slug: '' });
  assert.equal(product.description, '');
  assert.deepEqual(product.imageUrls, []);
});
