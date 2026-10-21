/**
 * @file Catalog query parsing: what `?q`, `?page` and `?category` resolve to.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCatalogQuery } from '../src/lib/catalogQuery.js';
import { MAX_PAGE } from '../src/lib/pagination.js';

test('an empty query is page 1 of everything', () => {
  assert.deepEqual(parseCatalogQuery({}), { q: '', page: 1, category: null });
});

test('the search text is trimmed and cut to 100 characters', () => {
  assert.equal(parseCatalogQuery({ q: '  dock ' }).q, 'dock');
  assert.equal(parseCatalogQuery({ q: 'x'.repeat(150) }).q.length, 100);
  assert.equal(parseCatalogQuery({ q: ['a', 'b'] }).q, '');
});

test('the page is a positive integer, anything else is page 1', () => {
  assert.equal(parseCatalogQuery({ page: '3' }).page, 3);
  for (const page of ['0', '-2', 'abc', '1.5', '2abc', ['2', '3']]) {
    assert.equal(parseCatalogQuery({ page }).page, 1, String(page));
  }
  assert.equal(parseCatalogQuery({ page: String(MAX_PAGE + 5) }).page, MAX_PAGE);
});

test('the category is a string or null', () => {
  assert.equal(parseCatalogQuery({ category: 'audio' }).category, 'audio');
  assert.equal(parseCatalogQuery({ category: ['a'] }).category, null);
});
