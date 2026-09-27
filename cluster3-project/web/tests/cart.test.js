/**
 * @file Cart: the cookie rules and the controller's decisions.
 *
 * The cookie is client-editable, so most of what is worth testing is what
 * survives reading one back, and that prices never come from it. The
 * controller is exercised with a fake model; markup is not asserted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CART_COOKIE,
  MAX_LINES,
  MAX_QUANTITY,
  addToCart,
  cartCount,
  clampQuantity,
  parseCart,
  parseProductId,
  priceCart,
  removeFromCart,
  serialiseCart,
  setQuantity,
} from '../src/lib/cart.js';
import { CartController } from '../src/controllers/cart.controller.js';

/**
 * A response double recording cookies, redirects and renders.
 *
 * @returns {Object} The double.
 */
function fakeResponse() {
  return {
    locals: {},
    cookies: {},
    cleared: [],
    redirected: null,
    rendered: null,
    cookie(name, value) {
      this.cookies[name] = value;
    },
    clearCookie(name) {
      this.cleared.push(name);
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
  };
}

/**
 * A product in getById's shape.
 *
 * @param {number} id - Product id.
 * @param {number} priceAud - Unit price.
 * @returns {Object} The product.
 */
const product = (id, priceAud) => ({
  id,
  name: `Product ${id}`,
  category: { id: 1, name: 'Keyboards', slug: 'keyboards' },
  priceAud,
  description: '',
  imageUrls: [`https://example.test/${id}.png`],
});

/**
 * A model double: ids in `catalogue` exist, ids in `broken` throw, the rest are gone.
 *
 * @param {Record<number, number>} catalogue - Id to price.
 * @param {number[]} [broken] - Ids whose lookup fails.
 * @returns {Object} The double.
 */
function fakeModel(catalogue, broken = []) {
  return {
    async getById(id) {
      if (broken.includes(id)) throw new Error('feed down');
      return id in catalogue ? product(id, catalogue[id]) : null;
    },
  };
}

test('a cart survives a round trip through the cookie', () => {
  const lines = [{ id: 12, quantity: 1 }, { id: 7, quantity: 3 }];
  assert.deepEqual(parseCart(serialiseCart(lines)), lines);
});

test('unreadable cookie entries are dropped and repeats merged', () => {
  assert.deepEqual(parseCart('12:1,abc,7:x,-3:2,0:1,12:2, 5:1'), [{ id: 12, quantity: 3 }]);
  assert.deepEqual(parseCart(undefined), []);
  assert.deepEqual(parseCart(''), []);
});

test('quantities stay between 1 and the maximum', () => {
  assert.equal(clampQuantity(0), 1);
  assert.equal(clampQuantity('abc'), 1);
  assert.equal(clampQuantity(2.7), 2);
  assert.equal(clampQuantity(1000), MAX_QUANTITY);
  assert.deepEqual(parseCart('4:500'), [{ id: 4, quantity: MAX_QUANTITY }]);
});

test('adding merges with an existing line', () => {
  const lines = addToCart([{ id: 1, quantity: 2 }], 1, 3);
  assert.deepEqual(lines, [{ id: 1, quantity: 5 }]);
});

test('a full cart refuses a new product but still accepts more of one it holds', () => {
  const full = Array.from({ length: MAX_LINES }, (_, index) => ({ id: index + 1, quantity: 1 }));

  assert.equal(addToCart(full, 999, 1), full);
  assert.equal(addToCart(full, 1, 1)[0].quantity, 2);
});

test('setting a quantity never adds a product, and removing drops only that line', () => {
  const lines = [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }];

  assert.deepEqual(setQuantity(lines, 3, 5), lines);
  assert.deepEqual(setQuantity(lines, 1, 0), [{ id: 1, quantity: 1 }, { id: 2, quantity: 1 }]);
  assert.deepEqual(removeFromCart(lines, 1), [{ id: 2, quantity: 1 }]);
  assert.equal(cartCount(lines), 3);
});

test('only a plain positive integer is a product id', () => {
  assert.equal(parseProductId('42'), 42);
  assert.equal(parseProductId(42), 42);
  for (const raw of ['', ' 7', '0', '-1', '1.5', '1e3', undefined, ['1']]) {
    assert.equal(parseProductId(raw), null, String(raw));
  }
});

test('totals are summed in cents', () => {
  const { items, subtotalAud } = priceCart([
    { product: { priceAud: 0.1 }, quantity: 3 },
    { product: { priceAud: 0.2 }, quantity: 1 },
  ]);

  assert.equal(subtotalAud, 0.5);
  assert.equal(items[0].lineTotalAud, 0.3);
});

test('the cart page prices lines from the catalogue, not the cookie', async () => {
  const res = fakeResponse();
  await new CartController(fakeModel({ 1: 149, 2: 79 })).show(
    { cookies: { [CART_COOKIE]: '1:1,2:2' }, query: {} },
    res,
  );

  const { locals } = res.rendered;
  assert.equal(locals.page, 'cart');
  assert.deepEqual(locals.items.map((item) => item.lineTotalAud), [149, 158]);
  assert.equal(locals.subtotalAud, 307);
  assert.equal(locals.unavailableCount, 0);
});

test('a product that no longer exists is pruned; one that cannot be read is kept', async () => {
  const res = fakeResponse();
  await new CartController(fakeModel({ 1: 10 }, [3])).show(
    { cookies: { [CART_COOKIE]: '1:1,2:4,3:1' }, query: {} },
    res,
  );

  assert.equal(res.cookies[CART_COOKIE], '1:1,3:1');
  assert.equal(res.locals.cartCount, 2);
  assert.equal(res.rendered.locals.items.length, 1);
  assert.equal(res.rendered.locals.unavailableCount, 1);
});

test('only a known notice key reaches the page', async () => {
  const known = fakeResponse();
  await new CartController(fakeModel({})).show({ cookies: {}, query: { notice: 'full' } }, known);
  assert.match(known.rendered.locals.notice, /up to/);

  const unknown = fakeResponse();
  await new CartController(fakeModel({})).show({ cookies: {}, query: { notice: 'toString' } }, unknown);
  assert.equal(unknown.rendered.locals.notice, null);
});

test('adding a product writes the cookie and redirects to the cart', async () => {
  const res = fakeResponse();
  await new CartController(fakeModel({ 5: 20 })).add(
    { cookies: { [CART_COOKIE]: '1:1' }, body: { productId: '5', quantity: '2' } },
    res,
  );

  assert.equal(res.cookies[CART_COOKIE], '1:1,5:2');
  assert.deepEqual(res.redirected, { status: 303, url: '/cart' });
});

test('adding an unknown or malformed product is refused', async () => {
  const controller = new CartController(fakeModel({}));

  await assert.rejects(
    controller.add({ cookies: {}, body: { productId: '9' } }, fakeResponse()),
    (error) => error.output.statusCode === 404,
  );
  await assert.rejects(
    controller.add({ cookies: {}, body: { productId: 'x' } }, fakeResponse()),
    (error) => error.output.statusCode === 400,
  );
});

test('removing the last line clears the cookie', () => {
  const res = fakeResponse();
  new CartController(fakeModel({})).remove(
    { cookies: { [CART_COOKIE]: '1:1' }, params: { id: '1' } },
    res,
  );

  assert.deepEqual(res.cleared, [CART_COOKIE]);
  assert.equal(res.redirected.url, '/cart');
});
