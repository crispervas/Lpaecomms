/**
 * @file Account page: profile rules, tab resolution and controller locals.
 *
 * The page is a preview over sample data, so what is worth testing is the
 * deciding: which tab a query selects, what the profile form accepts, and that
 * a submission — valid or not — never changes the stored profile the sidebar
 * shows. Markup is not asserted; the controller's locals are.
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

const VALID = {
  firstName: 'Jordan',
  lastName: 'Kim',
  email: 'jordan.kim@email.com',
  phone: '+1 (415) 555-0148',
};

/**
 * A response double recording the status and the render call.
 *
 * @returns {Object} The double, with `statusCode` and `rendered` to assert on.
 */
function fakeResponse() {
  return {
    statusCode: 200,
    rendered: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
    },
  };
}

/**
 * A model double that counts order queries.
 *
 * @returns {Object} The double, with `orderCalls` to assert on.
 */
function fakeModel() {
  return {
    orderCalls: 0,
    async getProfile() {
      return { ...VALID, passwordChangedOn: '2026-06-26' };
    },
    async listOrders() {
      this.orderCalls += 1;
      return [{ number: 'LPA-1', title: 'A', placedOn: '2026-07-12', status: 'delivered', totalAud: 1 }];
    },
  };
}

test('a complete profile raises no errors', () => {
  assert.deepEqual(validateProfile(VALID), {});
});

test('the last name and phone are optional', () => {
  assert.deepEqual(validateProfile({ ...VALID, lastName: '', phone: '' }), {});
});

test('the first name and email are required', () => {
  const errors = validateProfile({ ...VALID, firstName: '', email: '' });

  assert.equal(errors.firstName, 'Please enter your first name.');
  assert.equal(errors.email, 'Please enter your email.');
});

test('a malformed email is rejected', () => {
  assert.equal(validateProfile({ ...VALID, email: 'jordan@' }).email, 'Please enter a valid email address.');
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

test('the profile tab renders the stored profile and skips the orders query', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).show({ query: {} }, res);

  const { locals } = res.rendered;
  assert.equal(locals.page, 'account');
  assert.equal(locals.tab, 'profile');
  assert.equal(locals.values.email, VALID.email);
  assert.equal(locals.initials, 'JK');
  assert.deepEqual(locals.orders, []);
  assert.equal(model.orderCalls, 0);
});

test('the orders tab renders the order history', async () => {
  const model = fakeModel();
  const res = fakeResponse();
  await new AccountController(model).show({ query: { tab: 'orders' } }, res);

  assert.equal(res.rendered.locals.tab, 'orders');
  assert.equal(res.rendered.locals.orders.length, 1);
  assert.deepEqual(res.rendered.locals.scripts, []);
});

test('an invalid submission answers 422 and keeps what was typed', async () => {
  const res = fakeResponse();
  await new AccountController(fakeModel()).saveProfile(
    { body: { ...VALID, firstName: 'Sam', email: 'nope' } },
    res,
  );

  assert.equal(res.statusCode, 422);
  assert.equal(res.rendered.locals.values.firstName, 'Sam');
  assert.ok(res.rendered.locals.errors.email);
  assert.equal(res.rendered.locals.notice, null);
});

test('a valid submission is answered with the preview notice, not saved', async () => {
  const res = fakeResponse();
  await new AccountController(fakeModel()).saveProfile({ body: { ...VALID, firstName: 'Sam' } }, res);

  const { locals } = res.rendered;
  assert.equal(res.statusCode, 200);
  assert.match(locals.notice, /cannot be saved/);
  // The form shows the submission; the sidebar keeps the stored profile.
  assert.equal(locals.values.firstName, 'Sam');
  assert.equal(locals.profile.firstName, 'Jordan');
});
