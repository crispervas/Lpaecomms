/**
 * @file CategoryCrudModel tests: a category that still holds products stays.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CategoryCrudModel } from '../src/models/categoryCrud.model.js';
import categoryResource from '../src/resources/category.resource.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

test('the category resource uses the guarded model', () => {
  assert.equal(categoryResource.Model, CategoryCrudModel);
});

test('deleting a category with products is a 409 and writes nothing', async () => {
  const prisma = createFakePrisma({ category: { findFirst: { id: 3 }, update: {} }, product: { count: 2 } });
  await assert.rejects(
    new CategoryCrudModel(prisma, categoryResource).softDelete(3, {}),
    (err) => err.output?.statusCode === 409 && err.message === "Move or delete this category's products first.",
  );
  assert.deepEqual(prisma.calls.find((c) => c.model === 'product').args.where, { categoryId: 3, status: { not: 0 } });
  assert.ok(!prisma.calls.some((c) => c.method === 'update'));
});

test('an empty category is soft-deleted as usual', async () => {
  const prisma = createFakePrisma({ category: { findFirst: { id: 3 }, update: {} }, product: { count: 0 } });
  assert.deepEqual(await new CategoryCrudModel(prisma, categoryResource).softDelete(3, {}), { id: 3 });
});

test('a missing category is still null, without counting products', async () => {
  const prisma = createFakePrisma({ category: { findFirst: null }, product: { count: 5 } });
  assert.equal(await new CategoryCrudModel(prisma, categoryResource).softDelete(3, {}), null);
  assert.ok(!prisma.calls.some((c) => c.model === 'product'));
});
