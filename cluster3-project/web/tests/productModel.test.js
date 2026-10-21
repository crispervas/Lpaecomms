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
  id, name: `P${id}`, price: 12.5, stock: 7, img: [`https://img/${id}.jpg`, `https://img/${id}b.jpg`],
  description: 'd', category: { id: 2, name: 'Home', code: 'home' }, ...over,
});

test('listByCategory maps rows to cards and pages with skip/take', async () => {
  const prisma = createFakePrisma({ product: { findMany: [row(1)] } });
  const cards = await new ProductModel(prisma).listByCategory(2, 12, 24);
  assert.deepEqual(cards, [{ id: 1, name: 'P1', category: 'Home', priceAud: 12.5, imageUrl: 'https://img/1.jpg' }]);
  const args = prisma.calls[0].args;
  assert.deepEqual(args.where, { status: { not: 0 }, published: true, categoryId: 2 });
  assert.equal(args.skip, 24);
  assert.equal(args.take, 12);
});

test('listFeatured reads every category', async () => {
  const prisma = createFakePrisma({ product: { findMany: [] } });
  await new ProductModel(prisma).listFeatured(8);
  assert.deepEqual(prisma.calls[0].args.where, { status: { not: 0 }, published: true });
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
    description: 'd', imageUrls: ['https://img/3.jpg', 'https://img/3b.jpg'], stock: 7,
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
  assert.deepEqual(prisma.calls[0].args.where, { status: { not: 0 }, published: true, categoryId: 2, id: { notIn: [1, 3] } });
  assert.equal(prisma.calls[0].args.take, 4);
});

test('getById answers null for an id beyond int4 without querying', async () => {
  const prisma = createFakePrisma({ product: { findFirst: row(1) } });
  assert.equal(await new ProductModel(prisma).getById('99999999999'), null);
  assert.equal(prisma.calls.length, 0);
});

test('every storefront read hides draft products', async () => {
  const prisma = createFakePrisma({ product: { findMany: [], findFirst: null } });
  const model = new ProductModel(prisma);
  await model.listFeatured();
  await model.getById(1);
  await model.findByIds([1]);
  await model.findByCategoryExcluding(2, [1], 4);
  for (const call of prisma.calls) assert.equal(call.args.where.published, true, call.method);
});

test('search pages, filters by category and matches text case-insensitively', async () => {
  const prisma = createFakePrisma({ product: { count: 30, findMany: [row(1)] } });
  const result = await new ProductModel(prisma).search({ categoryId: 2, q: 'dock', page: 2 });
  assert.deepEqual(result, {
    items: [{ id: 1, name: 'P1', category: 'Home', priceAud: 12.5, imageUrl: 'https://img/1.jpg' }],
    total: 30, page: 2, pageCount: 3,
  });
  const find = prisma.calls.find((c) => c.method === 'findMany').args;
  assert.equal(find.skip, 12);
  assert.equal(find.take, 12);
  assert.deepEqual(find.where, {
    status: { not: 0 }, published: true, categoryId: 2,
    OR: [
      { name: { contains: 'dock', mode: 'insensitive' } },
      { code: { contains: 'dock', mode: 'insensitive' } },
      { description: { contains: 'dock', mode: 'insensitive' } },
    ],
  });
  assert.deepEqual(prisma.calls.find((c) => c.method === 'count').args.where, find.where);
});

test('search without text or category reads the whole active catalogue', async () => {
  const prisma = createFakePrisma({ product: { count: 0, findMany: [] } });
  const result = await new ProductModel(prisma).search({ categoryId: null, q: '', page: 1 });
  assert.deepEqual(prisma.calls.find((c) => c.method === 'findMany').args.where, { status: { not: 0 }, published: true });
  assert.equal(result.pageCount, 1);
});
