/**
 * @file Customer session middleware: who the cookie resolves to, and the guard
 * that sends anonymous visitors to the login page.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { config } from '../src/config/env.js';
import { signToken } from '../src/lib/jwt.js';
import { SESSION_COOKIE } from '../src/lib/session.js';
import { customerSession, requireCustomer } from '../src/middlewares/customerSession.js';

const CUSTOMER = { id: 7, name: 'Jo', lastName: 'Kim', email: 'jo@example.com', phone: null, address: null };

/**
 * A response double recording cleared cookies and redirects.
 *
 * @returns {Object} The double.
 */
function fakeResponse() {
  return {
    locals: {},
    cleared: [],
    redirected: null,
    clearCookie(name, options) {
      this.cleared.push({ name, options });
    },
    redirect(status, url) {
      this.redirected = { status, url };
    },
  };
}

/**
 * A customer model double answering `findActive` from a fixed table.
 *
 * @param {Object<number, Object>} active - Active customers by id.
 * @returns {Object} The double, with `lookups` to assert on.
 */
function fakeModel(active) {
  return {
    lookups: [],
    async findActive(id) {
      this.lookups.push(id);
      return active[id] ?? null;
    },
  };
}

const run = async (middleware, req, res) => {
  let called = false;
  await middleware(req, res, () => { called = true; });
  return called;
};

test('a valid cookie for an active customer signs the request in', async () => {
  const req = { cookies: { [SESSION_COOKIE]: signToken({ id: 7, role: 'CUSTOMER' }) } };
  const res = fakeResponse();
  assert.equal(await run(customerSession(fakeModel({ 7: CUSTOMER })), req, res), true);
  assert.deepEqual(res.locals.customer, { id: 7, name: 'Jo', lastName: 'Kim', email: 'jo@example.com' });
  assert.deepEqual(req.customer, res.locals.customer);
  assert.equal(res.cleared.length, 0);
});

test('a customer blocked or deleted since signing in becomes anonymous and loses the cookie', async () => {
  const req = { cookies: { [SESSION_COOKIE]: signToken({ id: 7, role: 'CUSTOMER' }) } };
  const res = fakeResponse();
  await run(customerSession(fakeModel({})), req, res);
  assert.equal(res.locals.customer, null);
  assert.equal(req.customer, null);
  assert.equal(res.cleared[0].name, SESSION_COOKIE);
});

test('an admin token is not a web session', async () => {
  const req = { cookies: { [SESSION_COOKIE]: signToken({ id: 1, role: 'ADMIN' }) } };
  const res = fakeResponse();
  const model = fakeModel({ 1: { ...CUSTOMER, id: 1 } });
  await run(customerSession(model), req, res);
  assert.equal(res.locals.customer, null);
  assert.deepEqual(model.lookups, []);
  assert.equal(res.cleared.length, 1);
});

test('a garbage or expired cookie is cleared without an error', async () => {
  const expired = jwt.sign({ role: 'CUSTOMER' }, config.jwtSecret, { subject: '7', expiresIn: -10 });
  for (const token of ['nonsense', expired]) {
    const res = fakeResponse();
    assert.equal(await run(customerSession(fakeModel({ 7: CUSTOMER })), { cookies: { [SESSION_COOKIE]: token } }, res), true);
    assert.equal(res.locals.customer, null);
    assert.equal(res.cleared.length, 1);
  }
});

test('no cookie means anonymous, with nothing to clear', async () => {
  const res = fakeResponse();
  const model = fakeModel({});
  await run(customerSession(model), { cookies: {} }, res);
  assert.equal(res.locals.customer, null);
  assert.equal(res.cleared.length, 0);
  assert.deepEqual(model.lookups, []);
});

test('a database failure leaves the visitor anonymous but keeps the cookie', async () => {
  const req = { cookies: { [SESSION_COOKIE]: signToken({ id: 7, role: 'CUSTOMER' }) } };
  const res = fakeResponse();
  const model = { findActive: async () => { throw new Error('db down'); } };
  assert.equal(await run(customerSession(model), req, res), true);
  assert.equal(res.locals.customer, null);
  assert.equal(res.cleared.length, 0);
});

test('requireCustomer sends an anonymous visitor to log in and back', () => {
  const res = fakeResponse();
  let called = false;
  requireCustomer({ customer: null, originalUrl: '/checkout/shipping' }, res, () => { called = true; });
  assert.equal(called, false);
  assert.deepEqual(res.redirected, { status: 303, url: '/login?next=%2Fcheckout%2Fshipping' });
});

test('requireCustomer lets a signed-in customer through', () => {
  let called = false;
  requireCustomer({ customer: { id: 7 }, originalUrl: '/account' }, fakeResponse(), () => { called = true; });
  assert.equal(called, true);
});
