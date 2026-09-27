/**
 * @file Pagination tests.
 *
 * Covers the query parser (defaults, clamping, rejection) and the metadata
 * block, including the edges a client hits by hand-editing a URL.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { paginationQuerySchema, buildPagination, MAX_LIMIT } from '../src/lib/pagination.js';

const schema = paginationQuerySchema(['id', 'name']);

test('defaults apply when the query is empty', () => {
  assert.deepEqual(schema.parse({}), { page: 1, limit: 10, sort: 'id', order: 'desc' });
});

test('limit above the maximum is clamped, not rejected', () => {
  assert.equal(schema.parse({ limit: '1000' }).limit, MAX_LIMIT);
});

test('zero, negative and non-numeric page or limit are rejected', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: 'abc' }, { limit: '0' }]) {
    assert.equal(schema.safeParse(query).success, false, JSON.stringify(query));
  }
});

test('an unknown sort field is rejected', () => {
  assert.equal(schema.safeParse({ sort: 'password' }).success, false);
});

test('search is trimmed and dropped when blank', () => {
  assert.equal(schema.parse({ search: '  lamp ' }).search, 'lamp');
  assert.equal(schema.parse({ search: '   ' }).search, undefined);
});

test('buildPagination matches the documented example', () => {
  assert.deepEqual(buildPagination({ total: 1122, page: 1, limit: 10, count: 10 }), {
    total: 1122, page: 1, limit: 10, totalPages: 113, count: 10, hasNextPage: true, hasPrevPage: false,
  });
});

test('a page past the end reports no next page and zero count', () => {
  assert.deepEqual(buildPagination({ total: 5, page: 3, limit: 10, count: 0 }), {
    total: 5, page: 3, limit: 10, totalPages: 1, count: 0, hasNextPage: false, hasPrevPage: true,
  });
});

test('an empty table has zero pages', () => {
  assert.equal(buildPagination({ total: 0, page: 1, limit: 10, count: 0 }).totalPages, 0);
});
