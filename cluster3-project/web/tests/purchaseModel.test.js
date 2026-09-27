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
  { id: 1, price: 10.5 },
  { id: 2, price: 3 },
];

test('totals are computed from current prices, not from the client', async () => {
  const prisma = createFakePrisma({
    product: { findMany: products },
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
    product: { findMany: [products[1]] },
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
