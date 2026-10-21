/**
 * @file CategoryModel tests, against a fake Prisma client.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CategoryModel } from '../src/models/category.model.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

test('listCategories returns active categories that hold active products, as {id,name,slug}', async () => {
  const prisma = createFakePrisma({ category: { findMany: [{ id: 1, name: 'Books', code: 'books' }] } });
  assert.deepEqual(await new CategoryModel(prisma).listCategories(), [{ id: 1, name: 'Books', slug: 'books' }]);
  assert.deepEqual(prisma.calls[0].args.where, {
    status: { not: 0 },
    products: { some: { status: { not: 0 }, published: true } },
  });
});
