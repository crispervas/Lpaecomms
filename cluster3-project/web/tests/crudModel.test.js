/**
 * @file CrudModel tests.
 *
 * Asserts on the Prisma queries the model builds: active filter, search,
 * filters, paging, ordering, field stripping and soft delete.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { CrudModel } from '../src/models/crud.model.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

const resource = {
  path: 'categories',
  model: 'category',
  label: 'Category',
  searchable: ['name', 'code'],
  sortable: ['name'],
  filters: { code: { schema: z.string(), where: (v) => ({ code: v }) } },
  include: undefined,
};

test('list builds the active, search and filter where, and pages', async () => {
  const prisma = createFakePrisma({ category: { count: 25, findMany: [{ id: 1 }] } });
  const model = new CrudModel(prisma, resource);

  const result = await model.list({
    page: 3, limit: 10, sort: 'name', order: 'asc', search: 'lam', filters: { code: 'lamps' },
  });

  assert.deepEqual(result, { items: [{ id: 1 }], total: 25 });
  const findMany = prisma.calls.find((c) => c.method === 'findMany').args;
  assert.deepEqual(findMany.where, {
    AND: [
      { status: { not: 0 } },
      { code: 'lamps' },
      { OR: [
        { name: { contains: 'lam', mode: 'insensitive' } },
        { code: { contains: 'lam', mode: 'insensitive' } },
      ] },
    ],
  });
  assert.equal(findMany.skip, 20);
  assert.equal(findMany.take, 10);
  assert.deepEqual(findMany.orderBy, { name: 'asc' });
  const count = prisma.calls.find((c) => c.method === 'count').args;
  assert.deepEqual(count.where, findMany.where);
});

test('getById returns null for a missing or soft-deleted row', async () => {
  const prisma = createFakePrisma({ category: { findFirst: null } });
  assert.equal(await new CrudModel(prisma, resource).getById(9), null);
  assert.deepEqual(prisma.calls[0].args.where, { AND: [{ status: { not: 0 } }, { id: 9 }] });
});

test('create strips fields the model does not have', async () => {
  const prisma = createFakePrisma({ category: { create: (args) => ({ id: 1, ...args.data }) } });
  await new CrudModel(prisma, resource).create({ name: 'A', code: 'a', unixTime: 5, created: { user: 1 } });
  assert.deepEqual(prisma.calls[0].args.data, { name: 'A', code: 'a', created: { user: 1 } });
});

test('update returns null when the row is not active, without writing', async () => {
  const prisma = createFakePrisma({ category: { findFirst: null, update: {} } });
  assert.equal(await new CrudModel(prisma, resource).update(3, { name: 'B' }), null);
  assert.ok(!prisma.calls.some((c) => c.method === 'update'));
});

test('softDelete marks the row inactive and records who did it', async () => {
  const prisma = createFakePrisma({ category: { findFirst: { id: 3 }, update: { id: 3 } } });
  const updated = { user: 1 };
  assert.deepEqual(await new CrudModel(prisma, resource).softDelete(3, updated), { id: 3 });
  const call = prisma.calls.find((c) => c.method === 'update').args;
  assert.deepEqual(call, { where: { id: 3 }, data: { status: 0, statusName: 'INACTIVE', updated } });
});

test('a unique violation on create propagates for the error handler to map', async () => {
  const prisma = createFakePrisma({
    category: { create: () => { throw Object.assign(new Error('dup'), { code: 'P2002' }); } },
  });
  await assert.rejects(new CrudModel(prisma, resource).create({ name: 'A', code: 'a' }), { code: 'P2002' });
});
