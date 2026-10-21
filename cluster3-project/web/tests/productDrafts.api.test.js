/**
 * @file Draft products through the API.
 *
 * A draft (`published: false`) is visible to an authenticated ADMIN only; every
 * other caller, including a signed-in customer, reads the catalogue as if it
 * did not exist, so mobile keeps working without a token.
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

/** Build an app whose product reads return nothing, and the fake to inspect. */
function setup() {
  const prisma = createFakePrisma({ product: { count: 0, findMany: [], findFirst: null, create: (a) => a.data } });
  return { prisma, app: createApp({ prisma }) };
}

/** The `where.AND` list of the first product findMany. */
const listWhere = (prisma) => prisma.calls.find((c) => c.method === 'findMany').args.where.AND;

test('an anonymous list shows published products only', async () => {
  const { prisma, app } = setup();
  assert.equal((await request(app).get('/api/v1/products')).status, 200);
  assert.ok(listWhere(prisma).some((part) => part.published === true));
});

test('a customer token reads like an anonymous caller', async () => {
  const { prisma, app } = setup();
  assert.equal((await request(app).get('/api/v1/products').set('Authorization', customer)).status, 200);
  assert.ok(listWhere(prisma).some((part) => part.published === true));
});

test('an invalid token reads like an anonymous caller rather than failing', async () => {
  const { prisma, app } = setup();
  assert.equal((await request(app).get('/api/v1/products').set('Authorization', 'Bearer junk')).status, 200);
  assert.ok(listWhere(prisma).some((part) => part.published === true));
});

test('an admin sees drafts and may filter on published', async () => {
  const { prisma, app } = setup();
  await request(app).get('/api/v1/products').set('Authorization', admin);
  assert.ok(!listWhere(prisma).some((part) => 'published' in part));

  const second = setup();
  await request(second.app).get('/api/v1/products?published=false').set('Authorization', admin);
  assert.ok(listWhere(second.prisma).some((part) => part.published === false));
});

test('the published filter is ignored for anyone but an admin', async () => {
  const { prisma, app } = setup();
  await request(app).get('/api/v1/products?published=false');
  const parts = listWhere(prisma);
  assert.ok(parts.some((part) => part.published === true));
  assert.ok(!parts.some((part) => part.published === false));
});

test('a draft read by id is a 404 for an anonymous caller', async () => {
  const { prisma, app } = setup();
  const res = await request(app).get('/api/v1/products/5');
  assert.equal(res.status, 404);
  const where = prisma.calls.find((c) => c.method === 'findFirst').args.where.AND;
  assert.ok(where.some((part) => part.published === true));
});

test('a new product is published unless it says otherwise', async () => {
  const { prisma, app } = setup();
  const body = { categoryId: 1, name: 'Desk', code: 'desk', price: 10 };
  await request(app).post('/api/v1/products').set('Authorization', admin).send(body);
  const data = prisma.calls.find((c) => c.method === 'create').args.data;
  assert.equal(data.published, true);
});

test('an update may move a product to draft', async () => {
  const prisma = createFakePrisma({
    product: { findFirst: { id: 5 }, update: (a) => ({ id: 5, ...a.data }) },
  });
  const res = await request(createApp({ prisma }))
    .put('/api/v1/products/5').set('Authorization', admin).send({ published: false });
  assert.equal(res.status, 200);
  assert.equal(prisma.calls.find((c) => c.method === 'update').args.data.published, false);
});
