/**
 * @file CustomerModel tests, against a fake Prisma client: the queries that
 * decide who may sign in, what a sign-up writes, and whose orders are shown.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import { CustomerModel } from '../src/models/customer.model.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

test('findActive only finds an active, undeleted customer', async () => {
  const prisma = createFakePrisma({ user: { findFirst: null } });
  assert.equal(await new CustomerModel(prisma).findActive(7), null);
  assert.deepEqual(prisma.calls[0].args.where, { id: 7, status: 1, deletedAt: null, role: { code: 'CUSTOMER' } });
  assert.equal(prisma.calls[0].args.select.password, undefined);
});

test('create hashes the password and files the user as an active customer', async () => {
  const prisma = createFakePrisma({ user: { create: (a) => ({ id: 3, ...a.data }) } });
  const created = { user: null, role: 'CUSTOMER', source: 'web' };
  await new CustomerModel(prisma).create({
    name: 'Jo', lastName: 'Kim', email: 'jo@example.com', password: 'correct horse', created,
  });
  const { data } = prisma.calls[0].args;
  assert.notEqual(data.password, 'correct horse');
  assert.equal(await bcrypt.compare('correct horse', data.password), true);
  assert.deepEqual(data.role, { connect: { code: 'CUSTOMER' } });
  assert.deepEqual(data.gender, { connect: { code: 'UNDISCLOSED' } });
  assert.deepEqual(data.documentType, { connect: { code: 'PASSPORT' } });
  assert.equal(data.status, 1);
  assert.equal(data.statusName, 'ACTIVE');
  assert.equal(data.created, created);
  assert.equal(prisma.calls[0].args.select.password, undefined);
});

test('emailExists asks for the exact address', async () => {
  const prisma = createFakePrisma({ user: { findUnique: { id: 1 } } });
  assert.equal(await new CustomerModel(prisma).emailExists('jo@example.com'), true);
  assert.deepEqual(prisma.calls[0].args.where, { email: 'jo@example.com' });
});

test('listOrders reads only the customer’s live orders, newest first, as summaries', async () => {
  const prisma = createFakePrisma({
    purchase: {
      findMany: [{
        id: 9, reference: 'LPA-20261021-ABC123', createdAt: new Date('2026-10-21T03:00:00Z'),
        finalAmount: '258', paymentStatus: 'SUCCESS', fulfillmentStatus: 'PENDING',
        data: { lines: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] },
        products: [{ product: { name: 'Aria 87' } }, { product: { name: 'Glide X' } }],
      }],
    },
  });
  const orders = await new CustomerModel(prisma).listOrders(7);
  const { args } = prisma.calls[0];
  assert.deepEqual(args.where, { userId: 7, status: { not: 0 } });
  assert.deepEqual(args.orderBy, { createdAt: 'desc' });
  assert.deepEqual(orders, [{
    id: 9, reference: 'LPA-20261021-ABC123', placedOn: '2026-10-21', items: 3, title: 'Aria 87 and 1 more',
    finalAmount: 258, paymentStatus: 'SUCCESS', fulfillmentStatus: 'PENDING',
  }]);
});

test('getOrder only finds an order the customer owns', async () => {
  const prisma = createFakePrisma({ purchase: { findFirst: null } });
  assert.equal(await new CustomerModel(prisma).getOrder(7, 9), null);
  assert.deepEqual(prisma.calls[0].args.where, { id: 9, userId: 7, status: { not: 0 } });
});

test('updateProfile writes only the editable fields', async () => {
  const prisma = createFakePrisma({ user: { update: (a) => ({ id: 7, ...a.data }) } });
  await new CustomerModel(prisma).updateProfile(7, {
    name: 'Jo', lastName: 'Kim', phone: '0412 345 678', address: '', email: 'evil@example.com', updated: { user: 7 },
  });
  const { args } = prisma.calls[0];
  assert.deepEqual(args.where, { id: 7 });
  assert.deepEqual(args.data, { name: 'Jo', lastName: 'Kim', phone: '0412 345 678', address: null, updated: { user: 7 } });
});
