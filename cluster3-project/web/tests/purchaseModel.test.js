/**
 * @file PurchaseModel tests: server-side totals, validation of lines, atomicity.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';

import { PurchaseModel } from '../src/models/purchase.model.js';
import purchaseResource from '../src/resources/purchase.resource.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

const products = [
  { id: 1, name: 'Aria', price: 10.5, stock: 99 },
  { id: 2, name: 'Glide', price: 3, stock: 99 },
];

test('totals are computed from current prices, not from the client', async () => {
  const prisma = createFakePrisma({
    product: { findMany: products, updateMany: { count: 1 } },
    purchase: { create: (a) => ({ id: 9, ...a.data }) },
  });
  await new PurchaseModel(prisma, purchaseResource).create({
    userId: 1, paymentStatus: 'PENDING', taxes: 2, discountAmount: 1,
    products: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }], created: {},
  });
  const data = prisma.calls.find((c) => c.model === 'purchase').args.data;
  assert.equal(new Prisma.Decimal(data.totalAmount).toString(), '24');
  assert.equal(new Prisma.Decimal(data.finalAmount).toString(), '25');
  assert.deepEqual(
    data.products.create.map((l) => [l.productId, new Prisma.Decimal(l.amount).toString()]),
    [[1, '21'], [2, '3']],
  );
  assert.deepEqual(data.data.lines.map((l) => l.quantity), [2, 1]);
});

test('a discount larger than the total floors the final amount at zero', async () => {
  const prisma = createFakePrisma({
    product: { findMany: [products[1]], updateMany: { count: 1 } },
    purchase: { create: (a) => a.data },
  });
  await new PurchaseModel(prisma, purchaseResource).create({
    userId: 1, paymentStatus: 'PENDING', discountAmount: 50, products: [{ productId: 2, quantity: 1 }], created: {},
  });
  const data = prisma.calls.find((c) => c.model === 'purchase').args.data;
  assert.equal(new Prisma.Decimal(data.finalAmount).toString(), '0');
});

test('a missing or inactive product is a 400 and nothing is written', async () => {
  const prisma = createFakePrisma({ product: { findMany: [products[0]] }, purchase: { create: {} } });
  await assert.rejects(
    new PurchaseModel(prisma, purchaseResource).create({
      userId: 1, paymentStatus: 'PENDING', products: [{ productId: 1, quantity: 1 }, { productId: 99, quantity: 1 }], created: {},
    }),
    (err) => err.output?.statusCode === 400,
  );
  assert.ok(!prisma.calls.some((c) => c.model === 'purchase'));
});

test('the resource rejects an empty product list and a non-positive quantity', () => {
  const schema = purchaseResource.createSchema;
  assert.equal(schema.safeParse({ userId: 1, paymentStatus: 'PENDING', products: [] }).success, false);
  assert.equal(
    schema.safeParse({ userId: 1, paymentStatus: 'PENDING', products: [{ productId: 1, quantity: 0 }] }).success,
    false,
  );
});

test('the update schema cannot change money or lines', () => {
  const parsed = purchaseResource.updateSchema.parse({ paymentStatus: 'SUCCESS', finalAmount: 1, products: [] });
  assert.deepEqual(parsed, { paymentStatus: 'SUCCESS' });
});

test('updating data keeps the recorded lines', async () => {
  const lines = [{ productId: 1, quantity: 2, unitPrice: '14.95' }];
  const prisma = createFakePrisma({
    purchase: { findFirst: { id: 1, data: { lines, note: 'old' } }, update: (a) => a.data },
  });
  await new PurchaseModel(prisma, purchaseResource).update(1, { data: { note: 'gift', lines: [] } });
  const data = prisma.calls.find((c) => c.method === 'update').args.data.data;
  assert.deepEqual(data, { note: 'gift', lines });
});

test('updating data to null keeps the recorded lines', async () => {
  const lines = [{ productId: 1, quantity: 2, unitPrice: '14.95' }];
  const prisma = createFakePrisma({ purchase: { findFirst: { id: 1, data: { lines } }, update: (a) => a.data } });
  await new PurchaseModel(prisma, purchaseResource).update(1, { data: null });
  assert.deepEqual(prisma.calls.find((c) => c.method === 'update').args.data.data, { lines });
});

test('a draft product cannot be bought', async () => {
  const prisma = createFakePrisma({ product: { findMany: [] }, purchase: { create: {} } });
  await assert.rejects(
    new PurchaseModel(prisma, purchaseResource).create({
      userId: 1, paymentStatus: 'PENDING', products: [{ productId: 1, quantity: 1 }], created: {},
    }),
    (err) => err.output?.statusCode === 400,
  );
  assert.equal(prisma.calls[0].args.where.published, true);
});

test('a purchase decrements stock once per product, summing repeated lines', async () => {
  const prisma = createFakePrisma({
    product: { findMany: [{ id: 1, name: 'Aria', price: 10, stock: 5 }], updateMany: { count: 1 } },
    purchase: { create: (a) => a.data },
  });
  await new PurchaseModel(prisma, purchaseResource).create({
    userId: 1, paymentStatus: 'SUCCESS', created: {},
    products: [{ productId: 1, quantity: 2 }, { productId: 1, quantity: 1 }],
  });
  const updates = prisma.calls.filter((c) => c.method === 'updateMany');
  assert.deepEqual(updates.map((c) => c.args), [
    { where: { id: 1, stock: { gte: 3 } }, data: { stock: { decrement: 3 } } },
  ]);
});

test('asking for more than the stock is a 409 and no purchase is written', async () => {
  const prisma = createFakePrisma({
    product: { findMany: [{ id: 1, name: 'Aria', price: 10, stock: 2 }], updateMany: { count: 1 } },
    purchase: { create: {} },
  });
  await assert.rejects(
    new PurchaseModel(prisma, purchaseResource).create({
      userId: 1, paymentStatus: 'SUCCESS', created: {}, products: [{ productId: 1, quantity: 3 }],
    }),
    (err) => err.output.statusCode === 409 && /Only 2 left of Aria/.test(err.data.details[0].message),
  );
  assert.equal(prisma.calls.some((c) => c.model === 'purchase'), false);
  assert.equal(prisma.calls.some((c) => c.method === 'updateMany'), false);
});

test('a lost race on the conditional decrement is a 409', async () => {
  const prisma = createFakePrisma({
    product: { findMany: [{ id: 1, name: 'Aria', price: 10, stock: 5 }], updateMany: { count: 0 } },
    purchase: { create: {} },
  });
  await assert.rejects(
    new PurchaseModel(prisma, purchaseResource).create({
      userId: 1, paymentStatus: 'SUCCESS', created: {}, products: [{ productId: 1, quantity: 1 }],
    }),
    (err) => err.output.statusCode === 409,
  );
  assert.equal(prisma.calls.some((c) => c.model === 'purchase'), false);
});
