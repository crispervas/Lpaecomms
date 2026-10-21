/**
 * @file GET /stats: the admin dashboard's figures.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Prisma } from '@prisma/client';

import { createApp } from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const admin = `Bearer ${signToken({ id: 1, role: 'ADMIN' })}`;
const customer = `Bearer ${signToken({ id: 2, role: 'CUSTOMER' })}`;

/** A fake whose counts answer from the `where` they are asked. */
function fake() {
  return createFakePrisma({
    user: {
      count: ({ where }) => {
        if (where.role?.code === 'CUSTOMER') return 10;
        if (where.role?.code === 'ADMIN') return 2;
        if (where.status === 2) return 1;
        return 12;
      },
    },
    purchase: {
      count: 30,
      groupBy: [
        { fulfillmentStatus: 'PENDING', _count: { _all: 4 } },
        { fulfillmentStatus: 'DELIVERED', _count: { _all: 26 } },
      ],
      aggregate: { _sum: { finalAmount: new Prisma.Decimal('4821.505') } },
    },
    product: { count: ({ where }) => (where.published === true ? 36 : 40) },
    category: {
      findMany: [
        { id: 2, name: 'Mice', _count: { products: 3 } },
        { id: 1, name: 'Keyboards', _count: { products: 12 } },
      ],
    },
  });
}

test('answers the dashboard figures in the documented shape', async () => {
  const res = await request(createApp({ prisma: fake() })).get('/api/v1/stats').set('Authorization', admin);
  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Store statistics');
  assert.deepEqual(res.body.data, {
    users: { total: 12, customers: 10, admins: 2, blocked: 1 },
    orders: { total: 30, byFulfillment: { PENDING: 4, SHIPPED: 0, DELIVERED: 26, CANCELLED: 0 }, revenue: 4821.51 },
    products: { total: 40, published: 36, drafts: 4 },
    categories: [{ id: 1, name: 'Keyboards', products: 12 }, { id: 2, name: 'Mice', products: 3 }],
  });
});

test('revenue counts paid orders that were not cancelled, and is 0 with none', async () => {
  const prisma = fake();
  prisma.purchase.aggregate = async (args) => { prisma.calls.push({ model: 'purchase', method: 'aggregate', args }); return { _sum: { finalAmount: null } }; };
  const res = await request(createApp({ prisma })).get('/api/v1/stats').set('Authorization', admin);
  assert.equal(res.body.data.orders.revenue, 0);
  const where = prisma.calls.find((c) => c.method === 'aggregate').args.where;
  assert.deepEqual(where, { status: { not: 0 }, paymentStatus: 'SUCCESS', fulfillmentStatus: { not: 'CANCELLED' } });
});

test('deleted rows never count', async () => {
  const prisma = fake();
  await request(createApp({ prisma })).get('/api/v1/stats').set('Authorization', admin);
  for (const call of prisma.calls.filter((c) => c.method === 'count')) {
    const where = call.args.where;
    if (call.model === 'user') assert.equal(where.deletedAt, null);
    else assert.deepEqual(where.status === undefined ? null : where.status, { not: 0 });
  }
});

test('stats need an admin token', async () => {
  const app = createApp({ prisma: fake() });
  assert.equal((await request(app).get('/api/v1/stats')).status, 401);
  assert.equal((await request(app).get('/api/v1/stats').set('Authorization', customer)).status, 403);
});
