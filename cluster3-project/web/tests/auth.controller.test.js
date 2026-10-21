/**
 * @file Auth controller: real customer log in, sign-up and log out. Asserts
 * the status, cookies, redirects and locals — never markup.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AuthController } from '../src/controllers/auth.controller.js';
import { SESSION_COOKIE } from '../src/lib/session.js';
import { CHECKOUT_COOKIE } from '../src/lib/checkout.js';
import { verifyToken } from '../src/lib/jwt.js';

const INVALID = 'Email or password is incorrect.';
const CUSTOMER = {
  id: 7, name: 'Jo', lastName: 'Kim', email: 'jo@example.com', password: 'hash',
  status: 1, deletedAt: null, role: { code: 'CUSTOMER' },
};

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
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
    },
    clearCookie(name, options) {
      this.cleared.push({ name, options });
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
  };
}

/**
 * A customer model double.
 *
 * @param {Object|null} account - What `findForLogin` finds.
 * @param {Object} [options] - Behaviour switches.
 * @param {boolean} [options.taken] - Whether `emailExists` says yes.
 * @returns {Object} The double, with `created` to assert on.
 */
function fakeModel(account, { taken = false } = {}) {
  return {
    created: [],
    lookups: [],
    async findForLogin(email) {
      this.lookups.push(email);
      return account;
    },
    async emailExists() {
      return taken;
    },
    async create(input) {
      this.created.push(input);
      return { id: 11, name: input.name, lastName: input.lastName, email: input.email };
    },
  };
}

/**
 * A bcrypt.compare double that records what it was asked and answers `matches`.
 *
 * @param {boolean} matches - The answer.
 * @returns {Function & {calls: Array}} The double.
 */
function fakeCompare(matches) {
  const compare = async (plain, hash) => {
    compare.calls.push({ plain, hash });
    return matches;
  };
  compare.calls = [];
  return compare;
}

const loginBody = (over = {}) => ({ mode: 'login', email: 'Jo@Example.com', password: 'secret-pass', ...over });

test('a correct log in sets the session cookie and follows a safe next', async () => {
  const res = fakeResponse();
  await new AuthController(fakeModel(CUSTOMER), { compare: fakeCompare(true) })
    .login({ body: loginBody({ next: '/checkout/shipping' }), customer: null }, res);
  assert.equal(res.cookies[0].name, SESSION_COOKIE);
  assert.deepEqual(verifyToken(res.cookies[0].value), { id: 7, role: 'CUSTOMER' });
  assert.equal(res.cookies[0].options.httpOnly, true);
  assert.deepEqual(res.redirected, { status: 303, url: '/checkout/shipping' });
});

test('an unsafe next lands on the account page', async () => {
  const res = fakeResponse();
  await new AuthController(fakeModel(CUSTOMER), { compare: fakeCompare(true) })
    .login({ body: loginBody({ next: '//evil.com' }), customer: null }, res);
  assert.deepEqual(res.redirected, { status: 303, url: '/account' });
});

test('every refused log in gets the same 401 and no cookie', async () => {
  const cases = [
    ['wrong password', CUSTOMER, false],
    ['unknown email', null, true],
    ['admin', { ...CUSTOMER, role: { code: 'ADMIN' } }, true],
    ['blocked', { ...CUSTOMER, status: 2 }, true],
    ['deleted', { ...CUSTOMER, deletedAt: new Date() }, true],
  ];
  for (const [label, account, matches] of cases) {
    const res = fakeResponse();
    await new AuthController(fakeModel(account), { compare: fakeCompare(matches) })
      .login({ body: loginBody(), customer: null }, res);
    assert.equal(res.statusCode, 401, label);
    assert.equal(res.rendered.locals.errors.form, INVALID, label);
    assert.equal(res.rendered.locals.values.password, '', label);
    assert.equal(res.cookies.length, 0, label);
  }
});

test('an unknown email still costs a password comparison', async () => {
  const compare = fakeCompare(true);
  await new AuthController(fakeModel(null), { compare }).login({ body: loginBody(), customer: null }, fakeResponse());
  assert.equal(compare.calls.length, 1);
  assert.equal(compare.calls[0].plain, 'secret-pass');
});

test('the email is looked up lower-cased', async () => {
  const model = fakeModel(CUSTOMER);
  await new AuthController(model, { compare: fakeCompare(true) }).login({ body: loginBody(), customer: null }, fakeResponse());
  assert.deepEqual(model.lookups, ['jo@example.com']);
});

test('a valid sign-up creates the customer and signs them in', async () => {
  const model = fakeModel(null);
  const res = fakeResponse();
  await new AuthController(model, { compare: fakeCompare(true) }).login({
    body: { mode: 'signup', name: 'Jo', lastName: 'Kim', email: 'JO@example.com', password: 'correct-horse', next: '/cart' },
    customer: null,
  }, res);
  assert.equal(model.created.length, 1);
  assert.equal(model.created[0].email, 'jo@example.com');
  assert.equal(model.created[0].password, 'correct-horse');
  assert.equal(model.created[0].created.role, 'CUSTOMER');
  assert.equal(model.created[0].created.source, 'web');
  assert.deepEqual(verifyToken(res.cookies[0].value), { id: 11, role: 'CUSTOMER' });
  assert.deepEqual(res.redirected, { status: 303, url: '/cart' });
});

test('a sign-up with a taken email is a 422 on the email field', async () => {
  const model = fakeModel(null, { taken: true });
  const res = fakeResponse();
  await new AuthController(model, { compare: fakeCompare(true) }).login({
    body: { mode: 'signup', name: 'Jo', lastName: 'Kim', email: 'jo@example.com', password: 'correct-horse' },
    customer: null,
  }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.rendered.locals.errors.email, 'An account with this email already exists.');
  assert.equal(res.rendered.locals.values.password, '');
  assert.equal(model.created.length, 0);
  assert.equal(res.cookies.length, 0);
});

test('a malformed submission is a 422 without touching the model', async () => {
  const model = fakeModel(CUSTOMER);
  const res = fakeResponse();
  await new AuthController(model, { compare: fakeCompare(true) })
    .login({ body: { mode: 'login', email: 'nope', password: '' }, customer: null }, res);
  assert.equal(res.statusCode, 422);
  assert.deepEqual(model.lookups, []);
});

test('the next path survives a failed attempt', async () => {
  const res = fakeResponse();
  await new AuthController(fakeModel(null), { compare: fakeCompare(false) })
    .login({ body: loginBody({ next: '/checkout/payment' }), customer: null }, res);
  assert.equal(res.rendered.locals.next, '/checkout/payment');
});

test('a signed-in customer opening the login page goes to their account', () => {
  const res = fakeResponse();
  new AuthController(fakeModel(null)).showLogin({ query: {}, customer: { id: 7 } }, res);
  assert.deepEqual(res.redirected, { status: 303, url: '/account' });
});

test('the login page carries the next path from the query', () => {
  const res = fakeResponse();
  new AuthController(fakeModel(null)).showLogin({ query: { next: '/checkout/shipping' }, customer: null }, res);
  assert.equal(res.rendered.locals.next, '/checkout/shipping');
});

test('log out clears the session and any half-finished checkout, then goes home', () => {
  const res = fakeResponse();
  new AuthController(fakeModel(null)).logout({}, res);
  assert.deepEqual(res.cleared.map((c) => c.name).sort(), [CHECKOUT_COOKIE, SESSION_COOKIE].sort());
  assert.deepEqual(res.redirected, { status: 303, url: '/' });
});

test('signing in drops a checkout left behind by whoever used the browser before', async () => {
  const res = fakeResponse();
  await new AuthController(fakeModel(CUSTOMER), { compare: fakeCompare(true) })
    .login({ body: loginBody(), customer: null }, res);
  assert.deepEqual(res.cleared.map((c) => c.name), [CHECKOUT_COOKIE]);
});
