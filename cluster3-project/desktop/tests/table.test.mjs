/**
 * @file Tests for the sorting, paging and search shared by the admin tables.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesQuery, paginate, sortRows } from '../src/renderer/lib/table.mjs';

const ROWS = [
  { name: 'Jordan Kim', signedUpOn: '2026-07-12' },
  { name: 'Sam Ortiz', signedUpOn: '2024-01-04' },
  { name: 'Ava Chen', signedUpOn: '2026-06-28' },
];

const names = (rows) => rows.map((row) => row.name);

test('sorts by a text field, in both directions', () => {
  assert.deepEqual(names(sortRows(ROWS, { key: 'name', direction: 'asc' })), [
    'Ava Chen',
    'Jordan Kim',
    'Sam Ortiz',
  ]);
  assert.deepEqual(names(sortRows(ROWS, { key: 'signedUpOn', direction: 'desc' })), [
    'Jordan Kim',
    'Ava Chen',
    'Sam Ortiz',
  ]);
});

test('keeps the original order with no sort key, without mutating the input', () => {
  const sorted = sortRows(ROWS, { key: null, direction: 'asc' });
  assert.deepEqual(sorted, ROWS);
  assert.notEqual(sorted, ROWS);
});

test('pages through a list and reports the range shown', () => {
  const items = Array.from({ length: 10 }, (_, index) => index);
  assert.deepEqual(paginate(items, 2, 4), {
    items: [4, 5, 6, 7],
    page: 2,
    pageCount: 3,
    from: 5,
    to: 8,
    total: 10,
  });
});

test('clamps a page past the end to the last page', () => {
  const result = paginate([1, 2, 3], 5, 2);
  assert.equal(result.page, 2);
  assert.deepEqual(result.items, [3]);
});

test('reports one empty page for an empty list', () => {
  assert.deepEqual(paginate([], 1, 8), { items: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
});

test('matches a query against any field, ignoring case and outer spaces', () => {
  assert.equal(matchesQuery(['Ava Chen', 'ava.chen@email.com'], '  CHEN@ '), true);
  assert.equal(matchesQuery(['Ava Chen'], 'kim'), false);
  assert.equal(matchesQuery(['Ava Chen'], '   '), true);
});
