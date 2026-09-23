/**
 * @file Home page personalisation.
 *
 * Exercises the controllers directly with fake models. The point of these two
 * blocks is that the system decides them, so what matters is the deciding: a
 * dominant category inferred from a history, and a home page that survives the
 * whole mechanism failing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HomeController } from '../src/controllers/home.controller.js';
import { ProductDetailController } from '../src/controllers/productDetail.controller.js';
import { RECENT_COOKIE } from '../src/lib/recentlyViewed.js';

/**
 * A response double recording what a controller did to it.
 *
 * @returns {Object} The double, with `rendered` and `cookies` to assert on.
 */
function fakeResponse() {
  return {
    rendered: null,
    cookies: {},
    locals: {},
    cookie(name, value) {
      this.cookies[name] = value;
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
  };
}

test('viewing a product records it at the front of the history', async () => {
  const model = {
    getById: async () => ({
      id: 42,
      name: 'Product 42',
      category: { id: 9, name: 'Keyboards', slug: 'keyboards' },
      priceAud: 100,
      description: '',
      imageUrls: [],
    }),
    listByCategory: async () => [],
  };

  const res = fakeResponse();
  await new ProductDetailController(model).show(
    { params: { id: '42' }, cookies: { [RECENT_COOKIE]: '7,3' } },
    res,
    () => {},
  );

  assert.equal(res.cookies[RECENT_COOKIE], '42,7,3');
});

test('the home page recommends from the category viewed most', async () => {
  const model = {
    listFeatured: async () => [],
    // Two keyboards and one mouse: keyboards is what the visitor is reading.
    findByIds: async () => [
      { id: 12, name: 'K1', category: 'Keyboards', categoryId: 9, priceAud: 10, imageUrl: '' },
      { id: 7, name: 'M1', category: 'Mice', categoryId: 4, priceAud: 20, imageUrl: '' },
      { id: 3, name: 'K2', category: 'Keyboards', categoryId: 9, priceAud: 30, imageUrl: '' },
    ],
    findByCategoryExcluding: async (categoryId, excludeIds) => {
      assert.equal(categoryId, 9);
      // Everything already seen must be excluded, not just the same category's.
      assert.deepEqual([...excludeIds].sort((a, b) => a - b), [3, 7, 12]);
      return [{ id: 50, name: 'K3', category: 'Keyboards', priceAud: 40, imageUrl: '' }];
    },
  };

  const res = fakeResponse();
  await new HomeController(model).index({ cookies: { [RECENT_COOKIE]: '12,7,3' } }, res);

  assert.deepEqual(res.rendered.locals.recentlyViewed.map((p) => p.id), [12, 7, 3]);
  assert.deepEqual(res.rendered.locals.pickedForYou.map((p) => p.id), [50]);
});

test('a first-time visitor gets neither block and no lookups', async () => {
  let looked = false;
  const model = {
    listFeatured: async () => [],
    findByIds: async () => {
      looked = true;
      return [];
    },
    findByCategoryExcluding: async () => [],
  };

  const res = fakeResponse();
  await new HomeController(model).index({ cookies: {} }, res);

  assert.deepEqual(res.rendered.locals.recentlyViewed, []);
  assert.deepEqual(res.rendered.locals.pickedForYou, []);
  assert.equal(looked, false);
});

test('a failing recommendation costs a section, never the home page', async () => {
  const model = {
    listFeatured: async () => [{ id: 1, name: 'A', category: 'X', priceAud: 1, imageUrl: '' }],
    findByIds: async () => {
      throw new Error('feed down');
    },
    findByCategoryExcluding: async () => {
      throw new Error('feed down');
    },
  };

  const res = fakeResponse();
  await new HomeController(model).index({ cookies: { [RECENT_COOKIE]: '12' } }, res);

  assert.equal(res.rendered.view, 'layouts/base');
  assert.deepEqual(res.rendered.locals.recentlyViewed, []);
  assert.deepEqual(res.rendered.locals.pickedForYou, []);
  assert.equal(res.rendered.locals.products.length, 1);
});
