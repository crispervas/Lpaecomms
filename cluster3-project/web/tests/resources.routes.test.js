/**
 * @file Resource wiring tests.
 *
 * Checks every resource is mounted with the right access level and that the
 * product filters and schemas reach the request, through createApp with a fake
 * Prisma client.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { resources } from '../src/resources/index.js';
import { signToken } from '../src/lib/jwt.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const listable = Object.fromEntries(resources.map((r) => [r.model, { count: 0, findMany: [] }]));
const admin = `Bearer ${signToken({ id: 1, role: 'ADMIN' })}`;

test('catalogue resources are public to read, the rest need a token', async () => {
  const app = createApp({ prisma: createFakePrisma(listable) });
  for (const r of resources) {
    const res = await request(app).get(`/api/v1/${r.path}`);
    assert.equal(res.status, r.access.read === 'public' ? 200 : 401, r.path);
  }
});

test('every resource lists for an admin', async () => {
  const app = createApp({ prisma: createFakePrisma(listable) });
  for (const r of resources) {
    const res = await request(app).get(`/api/v1/${r.path}`).set('Authorization', admin);
    assert.equal(res.status, 200, r.path);
    assert.deepEqual(res.body.data, [], r.path);
  }
});

test('products filter by category code and id', async () => {
  const prisma = createFakePrisma(listable);
  await request(createApp({ prisma })).get('/api/v1/products?category=Lamps&categoryId=2');
  const where = prisma.calls.find((c) => c.model === 'product' && c.method === 'findMany').args.where;
  assert.deepEqual(where.AND.slice(1), [
    { categoryId: 2 },
    { category: { code: { equals: 'Lamps', mode: 'insensitive' } } },
  ]);
});

test('product create rejects a negative price and a missing category', async () => {
  const res = await request(createApp({ prisma: createFakePrisma(listable) }))
    .post('/api/v1/products')
    .set('Authorization', admin)
    .send({ name: 'X', code: 'x', price: -1 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['categoryId', 'price']);
});

test('product update does not reset stock or images to their defaults', async () => {
  const prisma = createFakePrisma({ product: { findFirst: { id: 1 }, update: (a) => a.data } });
  await request(createApp({ prisma })).put('/api/v1/products/1').set('Authorization', admin).send({ price: 5 });
  const data = prisma.calls.find((c) => c.method === 'update').args.data;
  assert.equal(data.stock, undefined);
  assert.equal(data.img, undefined);
  assert.equal(data.price, 5);
});

test('the feed catalogue endpoint is gone', async () => {
  const res = await request(createApp({ prisma: createFakePrisma(listable) })).get('/api/v1/catalog');
  assert.equal(res.status, 404);
});

test('ids and page numbers beyond PostgreSQL int4 are a 400, not a 500', async () => {
  const app = createApp({ prisma: createFakePrisma(listable) });
  assert.equal((await request(app).get('/api/v1/categories/3000000000')).status, 400);
  assert.equal((await request(app).get('/api/v1/products?page=1e300')).status, 400);
  assert.equal((await request(app).get('/api/v1/products?categoryId=3000000000')).status, 400);
  const res = await request(app)
    .post('/api/v1/products')
    .set('Authorization', admin)
    .send({ categoryId: 3000000000, name: 'X', code: 'x', price: 1, stock: 3000000000 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['categoryId', 'stock']);
});

test('an empty optional user document is stored as null, not as a duplicate ""', async () => {
  const prisma = createFakePrisma({ user: { create: (a) => ({ id: 9, ...a.data }) } });
  await request(createApp({ prisma }))
    .post('/api/v1/users')
    .set('Authorization', admin)
    .send({
      roleId: 2, genderId: 1, documentTypeId: 1, name: 'A', lastName: 'B',
      email: 'a@b.co', password: 'Secret123', document: '  ', phone: '', address: '',
    });
  const data = prisma.calls.find((c) => c.method === 'create').args.data;
  assert.equal(data.document, null);
  assert.equal(data.phone, null);
  assert.equal(data.address, null);
});
