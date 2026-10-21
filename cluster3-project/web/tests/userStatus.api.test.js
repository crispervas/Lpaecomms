/**
 * @file Blocking, unblocking and the self-protection rules for users.
 *
 * A blocked account keeps its data but cannot sign in, because login requires
 * `status === 1`. An admin can neither block nor delete their own account, so
 * the last admin cannot lock everyone out by accident.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const admin = `Bearer ${signToken({ id: 1, role: 'ADMIN' })}`;
const customer = `Bearer ${signToken({ id: 2, role: 'CUSTOMER' })}`;

/** An app whose user lookups find `existing` (or nothing when null). */
function setup(existing = { id: 7, status: 1 }) {
  const prisma = createFakePrisma({
    user: {
      findFirst: existing,
      update: (a) => ({ id: 7, name: 'Ada', ...a.data }),
      count: 0,
      findMany: [],
    },
  });
  return { prisma, app: createApp({ prisma }) };
}

const updateData = (prisma) => prisma.calls.find((c) => c.method === 'update')?.args.data;

test('block marks the account BLOCKED with an audit stamp', async () => {
  const { prisma, app } = setup();
  const res = await request(app).post('/api/v1/users/7/block').set('Authorization', admin);
  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'User blocked');
  const data = updateData(prisma);
  assert.equal(data.status, 2);
  assert.equal(data.statusName, 'BLOCKED');
  assert.equal(data.updated.user, 1);
});

test('unblock reactivates a blocked or pending account', async () => {
  for (const status of [2, -2]) {
    const { prisma, app } = setup({ id: 7, status });
    const res = await request(app).post('/api/v1/users/7/unblock').set('Authorization', admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'User unblocked');
    assert.equal(updateData(prisma).status, 1);
    assert.equal(updateData(prisma).statusName, 'ACTIVE');
  }
});

test('the response never carries the password hash', async () => {
  const { prisma, app } = setup();
  await request(app).post('/api/v1/users/7/block').set('Authorization', admin);
  assert.deepEqual(prisma.calls.find((c) => c.method === 'update').args.omit, { password: true });
});

test('an admin cannot block or delete their own account', async () => {
  const { prisma, app } = setup({ id: 1, status: 1 });
  const blocked = await request(app).post('/api/v1/users/1/block').set('Authorization', admin);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.message, 'You cannot block your own account.');
  const deleted = await request(app).delete('/api/v1/users/1').set('Authorization', admin);
  assert.equal(deleted.status, 409);
  assert.equal(deleted.body.message, 'You cannot delete your own account.');
  assert.equal(updateData(prisma), undefined);
});

test('deleting someone else still works', async () => {
  const { app } = setup();
  assert.equal((await request(app).delete('/api/v1/users/7').set('Authorization', admin)).status, 200);
});

test('an unknown or deleted user is a 404', async () => {
  const { app } = setup(null);
  const res = await request(app).post('/api/v1/users/7/block').set('Authorization', admin);
  assert.equal(res.status, 404);
  assert.equal(res.body.message, 'User not found.');
});

test('blocking needs an admin token and a valid id', async () => {
  const { app } = setup();
  assert.equal((await request(app).post('/api/v1/users/7/block')).status, 401);
  assert.equal((await request(app).post('/api/v1/users/7/block').set('Authorization', customer)).status, 403);
  assert.equal((await request(app).post('/api/v1/users/abc/unblock').set('Authorization', admin)).status, 400);
});

test('the user list filters by status', async () => {
  const expected = { active: 1, blocked: 2, pending: -2 };
  for (const [name, status] of Object.entries(expected)) {
    const { prisma, app } = setup();
    await request(app).get(`/api/v1/users?status=${name}`).set('Authorization', admin);
    const where = prisma.calls.find((c) => c.method === 'findMany').args.where.AND;
    assert.ok(where.some((part) => part.status === status), name);
  }
  const { app } = setup();
  assert.equal((await request(app).get('/api/v1/users?status=nope').set('Authorization', admin)).status, 400);
});
