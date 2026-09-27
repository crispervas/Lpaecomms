/**
 * @file Prisma error mapping tests.
 *
 * Uses plain objects shaped like PrismaClientKnownRequestError: the mapper
 * duck-types on `code`, which keeps these tests free of a database.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toBoom } from '../src/lib/prismaErrors.js';

const prismaError = (code, meta = {}) =>
  Object.assign(new Error(code), { name: 'PrismaClientKnownRequestError', code, meta });

test('P2002 becomes 409 naming the unique field', () => {
  const boom = toBoom(prismaError('P2002', { target: ['code'] }));
  assert.equal(boom.output.statusCode, 409);
  assert.match(boom.message, /code/);
  assert.deepEqual(boom.data.details, [{ field: 'code', message: 'code is already in use.' }]);
});

test('P2002 reads the field from a constraint name too', () => {
  assert.equal(toBoom(prismaError('P2002', { target: 'category_code_key' })).data.details[0].field, 'code');
});

test('P2025 becomes 404', () => {
  assert.equal(toBoom(prismaError('P2025')).output.statusCode, 404);
});

test('P2003 becomes 400 naming the reference', () => {
  const boom = toBoom(prismaError('P2003', { field_name: 'product_categoryId_fkey (index)' }));
  assert.equal(boom.output.statusCode, 400);
});

test('anything else is not mapped', () => {
  assert.equal(toBoom(new Error('boom')), null);
  assert.equal(toBoom(prismaError('P1001')), null);
});

test('P2002 from the pg driver adapter names the field from the constraint', () => {
  const boom = toBoom(prismaError('P2002', {
    modelName: 'category',
    driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['name'] } } },
  }));
  assert.equal(boom.data.details[0].field, 'name');
});

test('P2003 from the pg driver adapter names the foreign key field', () => {
  const boom = toBoom(prismaError('P2003', {
    modelName: 'product',
    driverAdapterError: { cause: { kind: 'ForeignKeyConstraintViolation', constraint: { index: 'product_categoryId_fkey' } } },
  }));
  assert.deepEqual(boom.data.details, [{ field: 'categoryId', message: 'categoryId does not reference an existing record.' }]);
});
