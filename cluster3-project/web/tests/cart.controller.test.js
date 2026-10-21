/**
 * @file Cart controller: lines capped to the stock, the stock notice, and
 * whether the checkout may start. Asserts locals, cookies and redirects only.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CartController } from '../src/controllers/cart.controller.js';
import { CART_COOKIE } from '../src/lib/cart.js';

/**
 * A response double recording render, cookies and redirects.
 *
 * @returns {Object} The double.
 */
function fakeResponse() {
  return {
    locals: {},
    rendered: null,
    cookies: [],
    redirected: null,
    render(view, locals) {
      this.rendered = { view, locals };
    },
    cookie(name, value) {
      this.cookies.push({ name, value });
    },
    clearCookie(name) {
      this.cookies.push({ name, value: null });
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
  };
}

/**
 * A product model double serving a fixed catalogue.
 *
 * @param {Object<number, Object>} catalogue - Products by id.
 * @returns {Object} The double.
 */
function fakeProducts(catalogue) {
  return { getById: async (id) => catalogue[id] ?? null };
}

const product = (id, stock) => ({
  id, name: `P${id}`, category: { name: 'Audio' }, priceAud: 10, imageUrls: [], stock,
});

test('a line asking for more than the stock is lowered, saved and explained', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 2) }))
    .show({ cookies: { [CART_COOKIE]: '1:5' }, query: {} }, res);
  const { locals } = res.rendered;
  assert.equal(locals.items[0].quantity, 2);
  assert.equal(locals.notice, 'Some quantities were reduced to what we have in stock.');
  assert.deepEqual(res.cookies, [{ name: CART_COOKIE, value: '1:2' }]);
});

test('a sold-out product leaves the cart', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 0), 2: product(2, 9) }))
    .show({ cookies: { [CART_COOKIE]: '1:1,2:1' }, query: {} }, res);
  assert.deepEqual(res.rendered.locals.items.map((item) => item.id), [2]);
  assert.deepEqual(res.cookies, [{ name: CART_COOKIE, value: '2:1' }]);
});

test('a cart within stock is left alone and may check out', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 9) }))
    .show({ cookies: { [CART_COOKIE]: '1:3' }, query: {} }, res);
  assert.equal(res.rendered.locals.notice, null);
  assert.equal(res.rendered.locals.canCheckout, true);
  assert.equal(res.cookies.length, 0);
});

test('an empty cart cannot check out', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({})).show({ cookies: {}, query: {} }, res);
  assert.equal(res.rendered.locals.canCheckout, false);
});

test('the stock notice can arrive from a redirect', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 9) }))
    .show({ cookies: { [CART_COOKIE]: '1:1' }, query: { notice: 'stock' } }, res);
  assert.equal(res.rendered.locals.notice, 'Some quantities were reduced to what we have in stock.');
});

test('adding more than the stock adds only what is there', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 3) }))
    .add({ body: { productId: '1', quantity: '5' }, cookies: { [CART_COOKIE]: '1:2' } }, res);
  assert.deepEqual(res.cookies, [{ name: CART_COOKIE, value: '1:3' }]);
  assert.deepEqual(res.redirected, { status: 303, url: '/cart?notice=stock' });
});

test('a sold-out product cannot be added', async () => {
  const res = fakeResponse();
  await new CartController(fakeProducts({ 1: product(1, 0) }))
    .add({ body: { productId: '1', quantity: '1' }, cookies: {} }, res);
  assert.deepEqual(res.cookies, []);
  assert.deepEqual(res.redirected, { status: 303, url: '/cart?notice=stock' });
});
