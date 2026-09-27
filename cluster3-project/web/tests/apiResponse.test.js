/**
 * @file Envelope builder tests.
 *
 * Pins the one response shape every /api/v1 endpoint shares, so a change to it
 * is a deliberate, visible edit rather than a drift in one controller.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sendOk, sendCreated, sendPage, errorBody } from '../src/lib/apiResponse.js';

/** Minimal Express response double that records status and body. */
function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('sendOk wraps one record with a null pagination', () => {
  const res = fakeRes();
  sendOk(res, { id: 1 }, 'Category found');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: 'Category found', data: { id: 1 }, pagination: null });
});

test('sendCreated answers 201', () => {
  const res = fakeRes();
  sendCreated(res, { id: 2 });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { message: 'Created', data: { id: 2 }, pagination: null });
});

test('sendPage carries the list and its pagination block', () => {
  const res = fakeRes();
  const pagination = { total: 1, page: 1, limit: 10, totalPages: 1, count: 1, hasNextPage: false, hasPrevPage: false };
  sendPage(res, [{ id: 1 }], pagination, 'Categories');
  assert.deepEqual(res.body, { message: 'Categories', data: [{ id: 1 }], pagination });
});

test('errorBody omits stack when none is given', () => {
  assert.deepEqual(errorBody({ message: 'Not Found' }), {
    message: 'Not Found', data: null, pagination: null, errors: [],
  });
  assert.equal(errorBody({ message: 'x', stack: 'trace' }).stack, 'trace');
});
