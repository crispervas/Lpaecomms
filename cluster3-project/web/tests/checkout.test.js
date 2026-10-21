/**
 * @file Checkout controller: shipping, simulated payment and confirmation.
 *
 * Asserts redirects, cookies, locals and what reaches the purchase model —
 * never markup. The card number must never reach the model or the page.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import boom from '@hapi/boom';

import { CheckoutController } from '../src/controllers/checkout.controller.js';
import { CART_COOKIE } from '../src/lib/cart.js';
import { CHECKOUT_COOKIE, serialiseCheckout } from '../src/lib/checkout.js';

const CUSTOMER = { id: 7, name: 'Jo', lastName: 'Kim', email: 'jo@example.com' };
const SHIPPING = {
  fullName: 'Jo Kim', address: '12 Queen St', city: 'Brisbane', state: 'QLD', postcode: '4000', phone: '0412 345 678',
};
const CARD = { cardholder: 'Jo Kim', cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' };

/**
 * A response double recording status, render, cookies and redirects.
 *
 * @returns {Object} The double.
 */
function fakeResponse() {
  return {
    statusCode: 200,
    rendered: null,
    cookies: [],
    cleared: [],
    redirected: null,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
    cookie(name, value) {
      this.cookies.push({ name, value });
    },
    clearCookie(name) {
      this.cleared.push(name);
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
  };
}

/**
 * The three model doubles the controller needs.
 *
 * @param {Object} [options] - Behaviour switches.
 * @param {Function} [options.create] - What `purchaseModel.create` does.
 * @param {Object|null} [options.order] - What `getOrder` finds.
 * @returns {{productModel: Object, customerModel: Object, purchaseModel: Object}} The doubles.
 */
function fakeModels({ create = async () => ({ id: 9 }), order = null } = {}) {
  const purchaseModel = {
    calls: [],
    async create(input) {
      this.calls.push(input);
      return create(input);
    },
  };
  return {
    productModel: {
      getById: async (id) => ({
        id, name: `P${id}`, category: { name: 'Audio' }, priceAud: 10, imageUrls: [], stock: 9,
      }),
    },
    customerModel: {
      findActive: async () => ({ ...CUSTOMER, phone: '0400 000 000', address: '1 Home St' }),
      getOrder: async () => order,
    },
    purchaseModel,
  };
}

const TOKEN = 'b'.repeat(32);
const checkoutCookie = (customerId = 7) => serialiseCheckout({ customerId, token: TOKEN, shipping: SHIPPING });
const controller = (models) => new CheckoutController(models.productModel, models.customerModel, models.purchaseModel);
const request = (over = {}) => ({
  customer: CUSTOMER,
  cookies: { [CART_COOKIE]: '1:2', [CHECKOUT_COOKIE]: checkoutCookie() },
  body: {},
  params: {},
  ...over,
});

test('an empty cart cannot reach shipping or payment', async () => {
  const models = fakeModels();
  for (const step of ['showShipping', 'showPayment']) {
    const res = fakeResponse();
    await controller(models)[step](request({ cookies: {} }), res);
    assert.deepEqual(res.redirected, { status: 303, url: '/cart' }, step);
  }
});

test('shipping is pre-filled from the profile until the customer has typed one', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).showShipping(request({ cookies: { [CART_COOKIE]: '1:2' } }), res);
  const { values } = res.rendered.locals;
  assert.equal(values.fullName, 'Jo Kim');
  assert.equal(values.phone, '0400 000 000');
  assert.equal(values.address, '1 Home St');
});

test('a valid shipping form is kept, for this customer, with a new checkout token', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).saveShipping(request({ body: SHIPPING, cookies: { [CART_COOKIE]: '1:2' } }), res);
  assert.equal(res.cookies[0].name, CHECKOUT_COOKIE);
  const stored = JSON.parse(res.cookies[0].value);
  assert.equal(stored.customerId, 7);
  assert.deepEqual(stored.shipping, SHIPPING);
  assert.match(stored.token, /^[0-9a-f]{32}$/);
  assert.deepEqual(res.redirected, { status: 303, url: '/checkout/payment' });
});

test('changing the address keeps the checkout token', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).saveShipping(request({ body: { ...SHIPPING, city: 'Gold Coast' } }), res);
  assert.equal(JSON.parse(res.cookies[0].value).token, TOKEN);
});

test('a checkout left by another customer is not shown or used', async () => {
  const shippingRes = fakeResponse();
  const otherCookies = { [CART_COOKIE]: '1:2', [CHECKOUT_COOKIE]: checkoutCookie(99) };
  await controller(fakeModels()).showShipping(request({ cookies: otherCookies }), shippingRes);
  assert.equal(shippingRes.rendered.locals.values.address, '1 Home St');

  const paymentRes = fakeResponse();
  await controller(fakeModels()).showPayment(request({ cookies: otherCookies }), paymentRes);
  assert.deepEqual(paymentRes.redirected, { status: 303, url: '/checkout/shipping' });
});

test('the checkout token reaches the purchase, so a double submit places one order', async () => {
  const models = fakeModels();
  await controller(models).pay(request({ body: CARD }), fakeResponse());
  assert.equal(models.purchaseModel.calls[0].checkoutToken, TOKEN);
});

test('an invalid shipping form is a 422 with its errors', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).saveShipping(request({ body: { ...SHIPPING, postcode: 'x' } }), res);
  assert.equal(res.statusCode, 422);
  assert.ok(res.rendered.locals.errors.postcode);
  assert.equal(res.cookies.length, 0);
});

test('payment without shipping goes back to shipping', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).showPayment(request({ cookies: { [CART_COOKIE]: '1:2' } }), res);
  assert.deepEqual(res.redirected, { status: 303, url: '/checkout/shipping' });
});

test('the payment page is priced from the catalogue', async () => {
  const res = fakeResponse();
  await controller(fakeModels()).showPayment(request(), res);
  assert.equal(res.rendered.locals.subtotalAud, 20);
  assert.deepEqual(res.rendered.locals.shipping, SHIPPING);
});

test('an invalid card is a 422 that never echoes the card back and writes nothing', async () => {
  const models = fakeModels();
  const res = fakeResponse();
  await controller(models).pay(request({ body: { ...CARD, cvc: '1' } }), res);
  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.rendered.locals.values, { cardholder: 'Jo Kim' });
  assert.ok(res.rendered.locals.errors.cvc);
  assert.equal(models.purchaseModel.calls.length, 0);
  assert.equal(JSON.stringify(res.rendered.locals).includes('4242 4242'), false);
});

test('a valid card creates a paid order and keeps only brand and last four digits', async () => {
  const models = fakeModels();
  const res = fakeResponse();
  await controller(models).pay(request({ body: CARD }), res);

  assert.equal(models.purchaseModel.calls.length, 1);
  const input = models.purchaseModel.calls[0];
  assert.equal(input.userId, 7);
  assert.equal(input.paymentStatus, 'SUCCESS');
  assert.equal(input.fulfillmentStatus, 'PENDING');
  assert.ok(input.paymentDate instanceof Date);
  assert.match(input.reference, /^LPA-\d{8}-[0-9A-Z]{6}$/);
  assert.deepEqual(input.products, [{ productId: 1, quantity: 2 }]);
  assert.deepEqual(input.data, { shipping: SHIPPING, payment: { method: 'card', brand: 'Visa', last4: '4242' } });
  assert.equal(input.created.user, 7);
  assert.equal(input.created.role, 'CUSTOMER');
  assert.equal(input.created.source, 'web');
  const serialised = JSON.stringify(input);
  assert.equal(serialised.includes('4242424242424242'), false);
  assert.equal(serialised.includes('"123"'), false);

  assert.deepEqual(res.cleared.sort(), [CART_COOKIE, CHECKOUT_COOKIE].sort());
  assert.deepEqual(res.redirected, { status: 303, url: '/checkout/confirmation/9' });
});

test('running out of stock at payment goes back to the cart, which is kept', async () => {
  const models = fakeModels({ create: async () => { throw boom.conflict('Some products do not have enough stock.'); } });
  const res = fakeResponse();
  await controller(models).pay(request({ body: CARD }), res);
  assert.deepEqual(res.redirected, { status: 303, url: '/cart?notice=stock' });
  assert.deepEqual(res.cleared, []);
});

test('a product gone at payment goes back to the cart', async () => {
  const models = fakeModels({ create: async () => { throw boom.badRequest('Some products are not available.'); } });
  const res = fakeResponse();
  await controller(models).pay(request({ body: CARD }), res);
  assert.deepEqual(res.redirected, { status: 303, url: '/cart' });
});

test('any other failure reaches the error middleware', async () => {
  const models = fakeModels({ create: async () => { throw new Error('db down'); } });
  await assert.rejects(controller(models).pay(request({ body: CARD }), fakeResponse()), /db down/);
});

test('the confirmation shows only the customer’s own order', async () => {
  let fellThrough = false;
  await controller(fakeModels({ order: null })).showConfirmation(
    request({ params: { id: '9' } }), fakeResponse(), () => { fellThrough = true; },
  );
  assert.equal(fellThrough, true);

  const order = { id: 9, reference: 'LPA-20261021-ABC123', lines: [] };
  const res = fakeResponse();
  await controller(fakeModels({ order })).showConfirmation(request({ params: { id: '9' } }), res, () => {});
  assert.equal(res.rendered.locals.order, order);
});

test('a confirmation id that is not a number falls through', async () => {
  let fellThrough = false;
  await controller(fakeModels()).showConfirmation(request({ params: { id: '9abc' } }), fakeResponse(), () => { fellThrough = true; });
  assert.equal(fellThrough, true);
});
