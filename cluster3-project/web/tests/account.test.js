/**
 * @file Account page: profile rules, tab resolution and controller decisions.
 *
 * The page reads and saves the signed-in customer through CustomerModel, so
 * what is worth testing is the deciding: which tab a query selects, what the
 * profile form accepts, what a valid submission writes, and whose orders are
 * shown. Markup is not asserted; the controller's locals are.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROFILE_FIELDS,
  initials,
  normaliseProfile,
  resolveAccountTab,
  validateProfile,
} from '../src/lib/accountValidation.js';
import { AccountController } from '../src/controllers/account.controller.js';

const CUSTOMER = { id: 7, name: 'Jordan', lastName: 'Kim', email: 'jordan.kim@email.com' };
const PROFILE = { ...CUSTOMER, phone: '+1 (415) 555-0148', address: '12 Queen St' };
const VALID = { firstName: 'Jordan', lastName: 'Kim', phone: '+1 (415) 555-0148', address: '12 Queen St' };
const ORDERS = [{
  id: 9, reference: 'LPA-20261021-ABC123', placedOn: '2026-10-21', items: 2, title: 'Aria 87',
  finalAmount: 258, paymentStatus: 'SUCCESS', fulfillmentStatus: 'PENDING',
}];

/**
 * A response double recording the status, the render call and redirects.
 *
 * @returns {Object} The double, with `statusCode`, `rendered` and `redirected`.
 */
function fakeResponse() {
  return {
    statusCode: 200,
    rendered: null,
    redirected: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
  };
}

/**
 * A customer model double recording profile writes and order queries.
 *
 * @returns {Object} The double, with `updates` and `orderCalls` to assert on.
 */
function fakeModel() {
  return {
    updates: [],
    orderCalls: [],
    async findActive() {
      return { ...PROFILE };
    },
    async updateProfile(id, input) {
      this.updates.push({ id, input });
      return { ...PROFILE, ...input };
    },
    async listOrders(userId) {
      this.orderCalls.push(userId);
      return ORDERS;
    },
  };
}

test('a complete profile raises no errors', () => {
  assert.deepEqual(validateProfile(VALID), {});
});

test('the phone and address are optional', () => {
  assert.deepEqual(validateProfile({ ...VALID, phone: '', address: '' }), {});
});

test('the first and last names are required', () => {
  const errors = validateProfile({ ...VALID, firstName: '', lastName: '' });

  assert.equal(errors.firstName, 'Please enter your first name.');
  assert.equal(errors.lastName, 'Please enter your last name.');
});

test('the email is not a profile field: it cannot be changed here', () => {
  assert.equal('email' in PROFILE_FIELDS, false);
  assert.equal('email' in normaliseProfile({ ...VALID, email: 'evil@example.com' }), false);
});

test('a phone needs at least seven digits and only phone punctuation', () => {
  for (const phone of ['555-01', '+1 (415) abc-0148', '++61 412 345 678']) {
    assert.equal(validateProfile({ ...VALID, phone }).phone, 'Please enter a valid phone number.', phone);
  }
  for (const phone of ['0412 345 678', '+61.412.345.678', '5550148']) {
    assert.equal(validateProfile({ ...VALID, phone }).phone, undefined, phone);
  }
});

test('the phone pattern compiles under the v flag browsers use for `pattern`', () => {
  // A class with a bare "(" or "-" is legal in a JS literal but a syntax error
  // under `v`, and the browser would then silently skip the check.
  const source = `^(?:${PROFILE_FIELDS.phone.htmlPattern})$`;

  assert.doesNotThrow(() => new RegExp(source, 'v'));
  assert.equal(new RegExp(source, 'v').test('+1 (415) 555-0148'), true);
});

test('normalising keeps only the declared fields, trimmed', () => {
  const values = normaliseProfile({ firstName: '  Jordan ', role: 'admin' });

  assert.equal(values.firstName, 'Jordan');
  assert.equal('role' in values, false);
});

test('an unknown or repeated tab falls back to the profile', () => {
  assert.equal(resolveAccountTab('orders'), 'orders');
  assert.equal(resolveAccountTab('billing'), 'profile');
  assert.equal(resolveAccountTab(['orders', 'orders']), 'profile');
  assert.equal(resolveAccountTab(undefined), 'profile');
});

test('initials take the first letter of each name', () => {
  assert.equal(initials('jordan', 'kim'), 'JK');
  assert.equal(initials('Jordan', ''), 'J');
});

test('the profile tab renders the customer and skips the orders query', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).show({ query: {}, customer: CUSTOMER }, res);

  const { locals } = res.rendered;
  assert.equal(locals.page, 'account');
  assert.equal(locals.tab, 'profile');
  assert.deepEqual(locals.values, VALID);
  assert.equal(locals.profile.email, CUSTOMER.email);
  assert.equal(locals.initials, 'JK');
  assert.deepEqual(locals.orders, []);
  assert.deepEqual(model.orderCalls, []);
  assert.equal(locals.notice, null);
});

test('the orders tab lists the signed-in customer’s orders', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).show({ query: { tab: 'orders' }, customer: CUSTOMER }, res);

  assert.deepEqual(model.orderCalls, [7]);
  assert.equal(res.rendered.locals.orders, ORDERS);
  assert.deepEqual(res.rendered.locals.scripts, []);
});

test('a saved profile is confirmed after the redirect', async () => {
  const res = fakeResponse();
  await new AccountController(fakeModel()).show({ query: { saved: '1' }, customer: CUSTOMER }, res);
  assert.equal(res.rendered.locals.notice, 'Your profile has been saved.');
});

test('an invalid submission answers 422, keeps what was typed and saves nothing', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).saveProfile(
    { body: { ...VALID, firstName: 'Sam', lastName: '' }, customer: CUSTOMER },
    res,
  );

  assert.equal(res.statusCode, 422);
  assert.equal(res.rendered.locals.values.firstName, 'Sam');
  assert.ok(res.rendered.locals.errors.lastName);
  assert.deepEqual(model.updates, []);
});

test('a valid submission saves the customer’s own profile and redirects', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).saveProfile(
    { body: { ...VALID, firstName: 'Sam', email: 'evil@example.com' }, customer: CUSTOMER },
    res,
  );

  assert.equal(model.updates.length, 1);
  const { id, input } = model.updates[0];
  assert.equal(id, 7);
  assert.equal(input.name, 'Sam');
  assert.equal(input.lastName, 'Kim');
  assert.equal(input.phone, VALID.phone);
  assert.equal(input.address, VALID.address);
  assert.equal('email' in input, false);
  assert.equal(input.updated.user, 7);
  assert.deepEqual(res.redirected, { status: 303, url: '/account?saved=1' });
});
