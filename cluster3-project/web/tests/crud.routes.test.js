/**
 * @file CRUD router tests.
 *
 * Drives buildCrudRouter through a real Express app and the real error chain,
 * with a fake Prisma client. Covers the envelope, paging, access control,
 * validation, not-found and soft delete.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

import { buildCrudRouter } from '../src/routes/api/crud.routes.js';
import { CrudModel } from '../src/models/crud.model.js';
import { requestTime } from '../src/middlewares/requestTime.js';
import { logErrors, wrapErrors, errorHandler } from '../src/config/errorHandler.js';
import { signToken } from '../src/lib/jwt.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

// logErrors prints every expected 4xx; keep the report readable.
let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const createSchema = z.object({ name: z.string().min(1), code: z.string().min(1) });
const resource = {
  path: 'categories', model: 'category', label: 'Category',
  searchable: ['name'], sortable: ['name'], filters: {},
  createSchema, updateSchema: createSchema.partial(),
  access: { read: 'public', write: 'ADMIN' }, Model: CrudModel,
};

function appWith(prisma) {
  const app = express();
  app.use(express.json());
  app.use('/api', requestTime);
  app.use('/api/v1', buildCrudRouter(resource, prisma));
  app.use(logErrors, wrapErrors, errorHandler);
  return app;
}

const admin = `Bearer ${signToken({ id: 1, role: 'ADMIN' })}`;
const customer = `Bearer ${signToken({ id: 2, role: 'CUSTOMER' })}`;

test('GET list answers the envelope with pagination', async () => {
  const prisma = createFakePrisma({ category: { count: 21, findMany: [{ id: 1 }, { id: 2 }] } });
  const res = await request(appWith(prisma)).get('/api/v1/categories?page=2&limit=2');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(res.body.pagination, {
    total: 21, page: 2, limit: 2, totalPages: 11, count: 2, hasNextPage: true, hasPrevPage: true,
  });
});

test('GET list with a bad page answers 400', async () => {
  const res = await request(appWith(createFakePrisma())).get('/api/v1/categories?page=0');
  assert.equal(res.status, 400);
  assert.equal(res.body.errors[0].field, 'page');
});

test('GET one answers 404 in the envelope when missing', async () => {
  const prisma = createFakePrisma({ category: { findFirst: null } });
  const res = await request(appWith(prisma)).get('/api/v1/categories/9');
  assert.equal(res.status, 404);
  assert.equal(res.body.data, null);
});

test('GET one with a non-numeric id answers 400', async () => {
  const res = await request(appWith(createFakePrisma())).get('/api/v1/categories/abc');
  assert.equal(res.status, 400);
});

test('POST without a token is 401, with a customer token 403', async () => {
  const app = appWith(createFakePrisma());
  assert.equal((await request(app).post('/api/v1/categories').send({ name: 'A', code: 'a' })).status, 401);
  assert.equal(
    (await request(app).post('/api/v1/categories').set('Authorization', customer).send({ name: 'A', code: 'a' })).status,
    403,
  );
});

test('POST as admin creates with a server-side audit block and ignores forged fields', async () => {
  const prisma = createFakePrisma({ category: { create: (args) => ({ id: 5, ...args.data }) } });
  const res = await request(appWith(prisma))
    .post('/api/v1/categories')
    .set('Authorization', admin)
    .send({ name: 'Lamps', code: 'lamps', status: 1, created: { user: 999 }, unixTime: 1, time: '2026-01-01T00:00:00Z' });
  assert.equal(res.status, 201);
  const data = prisma.calls[0].args.data;
  assert.equal(data.created.user, 1);
  assert.equal(data.created.role, 'ADMIN');
  assert.equal(data.created.client, '2026-01-01T00:00:00Z');
  assert.equal(data.status, undefined);
  assert.equal(data.unixTime, undefined);
});

test('PUT with an empty body answers 400', async () => {
  const res = await request(appWith(createFakePrisma()))
    .put('/api/v1/categories/1').set('Authorization', admin).send({});
  assert.equal(res.status, 400);
});

test('DELETE soft-deletes and returns the id', async () => {
  const prisma = createFakePrisma({ category: { findFirst: { id: 3 }, update: { id: 3 } } });
  const res = await request(appWith(prisma)).delete('/api/v1/categories/3').set('Authorization', admin);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { id: 3 });
  assert.equal(prisma.calls.find((c) => c.method === 'update').args.data.status, 0);
});
