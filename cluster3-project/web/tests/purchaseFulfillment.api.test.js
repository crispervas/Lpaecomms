/**
 * @file Order fulfilment status through the API.
 *
 * Fulfilment (has it shipped?) is tracked apart from payment (has it been
 * paid?), so the admin can move an order through shipping without touching
 * the money fields the update schema keeps fixed.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { signToken } from '../src/lib/jwt.js';
import purchaseResource, { FULFILLMENT_STATUSES } from '../src/resources/purchase.resource.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

let originalConsoleError;
before(() => { originalConsoleError = console.error; console.error = () => {}; });
after(() => { console.error = originalConsoleError; });

const admin = `Bearer ${signToken({ id: 1, role: 'ADMIN' })}`;

/** An app with one existing purchase, and the fake to inspect. */
function setup() {
  const prisma = createFakePrisma({
    purchase: { findFirst: { id: 3, data: null }, update: (a) => ({ id: 3, ...a.data }), count: 0, findMany: [] },
  });
  return { prisma, app: createApp({ prisma }) };
}

test('the fulfilment statuses are the four the desktop shows', () => {
  assert.deepEqual(FULFILLMENT_STATUSES, ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
});

test('an update can move an order to SHIPPED', async () => {
  const { prisma, app } = setup();
  const res = await request(app).put('/api/v1/purchases/3').set('Authorization', admin).send({ fulfillmentStatus: 'SHIPPED' });
  assert.equal(res.status, 200);
  assert.equal(prisma.calls.find((c) => c.method === 'update').args.data.fulfillmentStatus, 'SHIPPED');
});

test('an unknown fulfilment status is a 400 on that field', async () => {
  const { app } = setup();
  const res = await request(app).put('/api/v1/purchases/3').set('Authorization', admin).send({ fulfillmentStatus: 'LOST' });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors[0].field, 'fulfillmentStatus');
});

test('the list filters by fulfilment status', async () => {
  const { prisma, app } = setup();
  await request(app).get('/api/v1/purchases?fulfillmentStatus=DELIVERED').set('Authorization', admin);
  const where = prisma.calls.find((c) => c.method === 'findMany').args.where.AND;
  assert.ok(where.some((part) => part.fulfillmentStatus === 'DELIVERED'));
});

test('a new order starts PENDING unless it says otherwise', () => {
  const parsed = purchaseResource.createSchema.parse({ userId: 1, paymentStatus: 'PENDING', products: [{ productId: 1, quantity: 1 }] });
  assert.equal(parsed.fulfillmentStatus, 'PENDING');
});
