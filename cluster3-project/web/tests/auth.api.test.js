/**
 * @file Login endpoint tests.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcrypt';

import { createApp } from '../src/app.js';
import { verifyToken } from '../src/lib/jwt.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const hash = await bcrypt.hash('Correct123!', 4);
const row = (over = {}) => ({
  id: 3, name: 'Ada', lastName: 'L', email: 'ada@lpa.test', password: hash,
  status: 1, deletedAt: null, role: { code: 'ADMIN' }, ...over,
});

const login = (user, body) =>
  request(createApp({ prisma: createFakePrisma({ user: { findUnique: user } }) }))
    .post('/api/v1/auth/login')
    .send(body);

test('valid credentials return a token for that user and role', async () => {
  const res = await login(row(), { email: 'ADA@lpa.test ', password: 'Correct123!' });
  assert.equal(res.status, 200);
  assert.deepEqual(verifyToken(res.body.data.token), { id: 3, role: 'ADMIN' });
  assert.equal(res.body.data.user.password, undefined);
  assert.equal(res.body.data.user.role, 'ADMIN');
});

test('wrong password, unknown email, inactive and deleted users get the same 401', async () => {
  const cases = [
    await login(row(), { email: 'ada@lpa.test', password: 'Wrong123!' }),
    await login(null, { email: 'no@lpa.test', password: 'Correct123!' }),
    await login(row({ status: 0 }), { email: 'ada@lpa.test', password: 'Correct123!' }),
    await login(row({ deletedAt: new Date() }), { email: 'ada@lpa.test', password: 'Correct123!' }),
  ];
  for (const res of cases) {
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Email or password is incorrect.');
  }
});

test('a malformed body is 400', async () => {
  assert.equal((await login(null, { email: 'x' })).status, 400);
});
