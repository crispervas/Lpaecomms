/**
 * @file Tests for the Dashboard's bar scaling.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { barWidths } from '../src/renderer/lib/barWidths.mjs';

test('scales every count against the largest', () => {
  assert.deepEqual(barWidths([{ count: 40 }, { count: 10 }, { count: 30 }]), [100, 25, 75]);
});

test('rounds to whole percentages', () => {
  assert.deepEqual(barWidths([{ count: 3 }, { count: 1 }]), [100, 33]);
});

test('returns zeros rather than NaN when every count is zero', () => {
  assert.deepEqual(barWidths([{ count: 0 }, { count: 0 }]), [0, 0]);
});

test('returns an empty list for no items', () => {
  assert.deepEqual(barWidths([]), []);
});
