/**
 * @file Model field lookup tests, against the generated Prisma DMMF.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scalarFields, pickFields } from '../src/lib/modelFields.js';

test('template has unixTime, category does not', () => {
  assert.ok(scalarFields('template').has('unixTime'));
  assert.ok(!scalarFields('category').has('unixTime'));
});

test('relation fields are not scalar', () => {
  assert.ok(!scalarFields('product').has('category'));
  assert.ok(scalarFields('product').has('categoryId'));
});

test('pickFields drops keys the model does not have', () => {
  assert.deepEqual(pickFields('category', { name: 'A', unixTime: 1, bogus: true }), { name: 'A' });
});

test('an unknown model throws', () => {
  assert.throws(() => scalarFields('nope'), /Unknown Prisma model/);
});
