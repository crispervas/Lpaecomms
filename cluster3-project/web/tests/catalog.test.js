/**
 * @file Catalog controller: which search, page and category reach the model,
 * and which locals reach the page. Markup is not asserted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CatalogController } from '../src/controllers/catalog.controller.js';

const CATEGORIES = [{ id: 2, name: 'Audio', slug: 'audio' }];

/**
 * A response double recording the render call.
 *
 * @returns {Object} The double, with `rendered` to assert on.
 */
function fakeResponse() {
  return {
    rendered: null,
    render(view, locals) {
      this.rendered = { view, locals };
    },
  };
}

/**
 * Product and category model doubles recording the search arguments.
 *
 * @param {Object} [result] - What `search` resolves to.
 * @returns {{productModel: Object, categoryModel: Object}} The doubles.
 */
function fakeModels(result = { items: [], total: 0, page: 1, pageCount: 1 }) {
  return {
    productModel: {
      searches: [],
      async search(args) {
        this.searches.push(args);
        return result;
      },
    },
    categoryModel: { listCategories: async () => CATEGORIES },
  };
}

test('search text, page and category reach the model', async () => {
  const { productModel, categoryModel } = fakeModels({ items: [], total: 30, page: 2, pageCount: 3 });
  const res = fakeResponse();
  await new CatalogController(productModel, categoryModel).index(
    { query: { q: 'dock', page: '2', category: 'audio' } }, res, () => {},
  );
  assert.deepEqual(productModel.searches, [{ categoryId: 2, q: 'dock', page: 2 }]);
  const { locals } = res.rendered;
  assert.equal(locals.q, 'dock');
  assert.equal(locals.pageNumber, 2);
  assert.equal(locals.pageCount, 3);
  assert.equal(locals.total, 30);
  assert.equal(locals.title, 'Lpaecomms — Results for "dock"');
});

test('without a search the title names the category or the catalog', async () => {
  const { productModel, categoryModel } = fakeModels();
  const res = fakeResponse();
  await new CatalogController(productModel, categoryModel).index({ query: { category: 'audio' } }, res, () => {});
  assert.equal(res.rendered.locals.title, 'Lpaecomms — Audio');
  assert.equal(res.rendered.locals.q, '');
});

test('an unknown category falls through to the 404 page', async () => {
  const { productModel, categoryModel } = fakeModels();
  let fellThrough = false;
  await new CatalogController(productModel, categoryModel).index(
    { query: { category: 'nope' } }, fakeResponse(), () => { fellThrough = true; },
  );
  assert.equal(fellThrough, true);
  assert.equal(productModel.searches.length, 0);
});
