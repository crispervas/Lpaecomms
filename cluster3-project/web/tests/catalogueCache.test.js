/**
 * @file Catalogue cache: stale-while-revalidate, shared requests, and the
 * home page fetching its sections side by side.
 *
 * `fetch` is replaced with a double that counts calls and can be held open, and
 * `Date` is mocked so a test can step past the fresh and stale windows without
 * waiting. Every test clears the model's module-level cache first.
 */

import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

import { ProductModel } from '../src/models/product.model.js';
import { HomeController } from '../src/controllers/home.controller.js';

const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const realFetch = globalThis.fetch;

/** A feed record in the shape `listFeatured` reads. */
const record = (id, price) => ({
  id,
  title: `Product ${id}`,
  price,
  category: { id: 1, name: 'Clothes' },
  images: [`https://example.test/${id}.png`],
});

/**
 * Install a fetch double answering every URL with `payload()`.
 *
 * @param {() => unknown} payload - Called per request, so a test can change the answer.
 * @param {{fail?: () => boolean}} [options] - `fail` makes a request answer 500.
 * @returns {{calls: number}} Live call counter.
 */
function stubFetch(payload, { fail = () => false } = {}) {
  const counter = { calls: 0 };
  globalThis.fetch = async () => {
    counter.calls += 1;
    if (fail()) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => payload() };
  };
  return counter;
}

/** Let queued promise callbacks — a background refresh — run to completion. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  ProductModel.clearCache();
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
});

afterEach(() => {
  mock.timers.reset();
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

test('an expired entry is served at once and refreshed in the background', async () => {
  let price = 10;
  const counter = stubFetch(() => [record(1, price)]);
  const model = new ProductModel();

  await model.listFeatured(1);
  price = 20;
  mock.timers.tick(FIVE_MINUTES + 1);

  const stale = await model.listFeatured(1);
  assert.equal(stale[0].priceAud, 10, 'the caller does not wait for the feed');

  await settle();
  assert.equal(counter.calls, 2, 'one background refresh ran');
  assert.equal((await model.listFeatured(1))[0].priceAud, 20, 'the next caller sees the refresh');
});

test('a failed background refresh keeps the stale entry', async () => {
  let failing = false;
  stubFetch(() => [record(1, 10)], { fail: () => failing });
  const model = new ProductModel();
  const logged = mock.method(console, 'error', () => {});

  await model.listFeatured(1);
  failing = true;
  mock.timers.tick(FIVE_MINUTES + 1);

  assert.equal((await model.listFeatured(1))[0].priceAud, 10);
  await settle();
  assert.equal((await model.listFeatured(1))[0].priceAud, 10);
  assert.ok(logged.mock.callCount() >= 1);
});

test('an entry past its stale window makes the caller wait for the feed', async () => {
  let price = 10;
  stubFetch(() => [record(1, price)]);
  const model = new ProductModel();

  await model.listFeatured(1);
  price = 30;
  mock.timers.tick(ONE_DAY + 1);

  assert.equal((await model.listFeatured(1))[0].priceAud, 30);
});

test('concurrent callers of one URL share a single request', async () => {
  const counter = stubFetch(() => [record(1, 10)]);
  const model = new ProductModel();

  await Promise.all([model.listFeatured(1), model.listFeatured(1), model.listFeatured(1)]);

  assert.equal(counter.calls, 1);
});

test('a failed request is not shared with later callers', async () => {
  let failing = true;
  stubFetch(() => [record(1, 10)], { fail: () => failing });
  const model = new ProductModel();

  await assert.rejects(model.listFeatured(1));
  failing = false;
  assert.equal((await model.listFeatured(1))[0].priceAud, 10);
});

test('the home page fetches the trending grid and the history side by side', async () => {
  const started = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const model = {
    async listFeatured() {
      started.push('featured');
      await gate;
      return [];
    },
    async findByIds() {
      started.push('history');
      await gate;
      return [];
    },
  };

  const res = { render: () => {} };
  const rendering = new HomeController(model).index({ cookies: { lpa_recent: '1' } }, res);

  await settle();
  assert.deepEqual(started.sort(), ['featured', 'history'], 'both began before either finished');

  release();
  await rendering;
});

test('warming the cache never rejects', async () => {
  const logged = mock.method(console, 'error', () => {});
  await HomeController.warmCache({ listFeatured: async () => { throw new Error('down'); } });
  assert.equal(logged.mock.callCount(), 1);
});
