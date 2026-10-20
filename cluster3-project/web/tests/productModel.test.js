/**
 * @file ProductModel tests, against a fake Prisma client.
 *
 * Checks the view-facing shapes and the queries behind them. The storefront
 * shows only active products.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ProductModel } from '../src/models/product.model.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

const row = (id, over = {}) => ({
  id, name: `P${id}`, price: 12.5, img: [`https://img/${id}.jpg`, `https://img/${id}b.jpg`],
  description: 'd', category: { id: 2, name: 'Home', code: 'home' }, ...over,
});

test('listByCategory maps rows to cards and pages with skip/take', async () => {
  const prisma = createFakePrisma({ product: { findMany: [row(1)] } });
  const cards = await new ProductModel(prisma).listByCategory(2, 12, 24);
  assert.deepEqual(cards, [{ id: 1, name: 'P1', category: 'Home', priceAud: 12.5, imageUrl: 'https://img/1.jpg' }]);
  const args = prisma.calls[0].args;
  assert.deepEqual(args.where, { status: { not: 0 }, categoryId: 2 });
  assert.equal(args.skip, 24);
  assert.equal(args.take, 12);
});

test('listFeatured reads every category', async () => {
  const prisma = createFakePrisma({ product: { findMany: [] } });
  await new ProductModel(prisma).listFeatured(8);
  assert.deepEqual(prisma.calls[0].args.where, { status: { not: 0 } });
  assert.equal(prisma.calls[0].args.take, 8);
});

test('a product without images yields an empty imageUrl', async () => {
  const prisma = createFakePrisma({ product: { findMany: [row(1, { img: [] })] } });
  assert.equal((await new ProductModel(prisma).listFeatured())[0].imageUrl, '');
});

test('getById returns the detail shape or null', async () => {
  const prisma = createFakePrisma({ product: { findFirst: row(3) } });
  assert.deepEqual(await new ProductModel(prisma).getById('3'), {
    id: 3, name: 'P3', category: { id: 2, name: 'Home', slug: 'home' }, priceAud: 12.5,
    description: 'd', imageUrls: ['https://img/3.jpg', 'https://img/3b.jpg'],
  });
  const none = createFakePrisma({ product: { findFirst: null } });
  assert.equal(await new ProductModel(none).getById(9), null);
});

test('getById refuses a non-integer id without querying', async () => {
  const prisma = createFakePrisma({ product: { findFirst: row(1) } });
  assert.equal(await new ProductModel(prisma).getById('1abc'), null);
  assert.equal(prisma.calls.length, 0);
});

test('findByIds keeps the requested order and drops missing ids', async () => {
  const prisma = createFakePrisma({ product: { findMany: [row(2), row(1)] } });
  const cards = await new ProductModel(prisma).findByIds([1, 5, 2]);
  assert.deepEqual(cards.map((c) => c.id), [1, 2]);
  assert.equal(cards[0].categoryId, 2);
});

test('findByIds asks for nothing when the history is empty', async () => {
  const prisma = createFakePrisma({ product: { findMany: [] } });
  assert.deepEqual(await new ProductModel(prisma).findByIds([]), []);
  assert.equal(prisma.calls.length, 0);
});

test('findByCategoryExcluding excludes in the query', async () => {
  const prisma = createFakePrisma({ product: { findMany: [row(4)] } });
  await new ProductModel(prisma).findByCategoryExcluding(2, [1, 3], 4);
  assert.deepEqual(prisma.calls[0].args.where, { status: { not: 0 }, categoryId: 2, id: { notIn: [1, 3] } });
  assert.equal(prisma.calls[0].args.take, 4);
});

test('getById answers null for an id beyond int4 without querying', async () => {
  const prisma = createFakePrisma({ product: { findFirst: row(1) } });
  assert.equal(await new ProductModel(prisma).getById('99999999999'), null);
  assert.equal(prisma.calls.length, 0);
});
