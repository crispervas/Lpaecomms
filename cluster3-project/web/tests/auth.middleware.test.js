/**
 * @file Authentication and authorisation middleware tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { config } from '../src/config/env.js';
import { signToken } from '../src/lib/jwt.js';
import { authenticate } from '../src/middlewares/authenticate.js';
import { authorize } from '../src/middlewares/authorize.js';
import { optionalAuthenticate } from '../src/middlewares/optionalAuthenticate.js';

const run = (mw, req) => new Promise((resolve) => mw(req, {}, resolve));
const withAuth = (value) => ({ headers: { authorization: value } });

test('a valid token sets req.user', async () => {
  const req = withAuth(`Bearer ${signToken({ id: 5, role: 'ADMIN' })}`);
  assert.equal(await run(authenticate, req), undefined);
  assert.deepEqual(req.user, { id: 5, role: 'ADMIN' });
});

test('missing, empty, tampered and expired tokens are 401', async () => {
  const expired = jwt.sign({ role: 'ADMIN' }, config.jwtSecret, { subject: '5', expiresIn: -10 });
  const forged = jwt.sign({ role: 'ADMIN' }, 'x'.repeat(40), { subject: '5' });
  const noneAlg = jwt.sign({ role: 'ADMIN' }, null, { subject: '5', algorithm: 'none' });
  for (const header of [undefined, 'Bearer', 'Bearer ', 'Basic abc', `Bearer ${expired}`, `Bearer ${forged}`, `Bearer ${noneAlg}`]) {
    const err = await run(authenticate, withAuth(header));
    assert.equal(err?.output?.statusCode, 401, String(header));
  }
});

test('authorize lets the listed role through and refuses others with 403', async () => {
  assert.equal(await run(authorize('ADMIN'), { user: { id: 1, role: 'ADMIN' } }), undefined);
  assert.equal((await run(authorize('ADMIN'), { user: { id: 2, role: 'CUSTOMER' } })).output.statusCode, 403);
  assert.equal((await run(authorize('ADMIN'), {})).output.statusCode, 401);
});

test('optionalAuthenticate sets req.user for a valid token', async () => {
  const req = withAuth(`Bearer ${signToken({ id: 5, role: 'ADMIN' })}`);
  assert.equal(await run(optionalAuthenticate, req), undefined);
  assert.deepEqual(req.user, { id: 5, role: 'ADMIN' });
});

test('optionalAuthenticate treats a missing or bad token as anonymous, never as an error', async () => {
  const expired = jwt.sign({ role: 'ADMIN' }, config.jwtSecret, { subject: '5', expiresIn: -10 });
  for (const header of [undefined, 'Bearer', 'Basic abc', 'Bearer nonsense', `Bearer ${expired}`]) {
    const req = withAuth(header);
    assert.equal(await run(optionalAuthenticate, req), undefined, String(header));
    assert.equal(req.user, undefined, String(header));
  }
});
