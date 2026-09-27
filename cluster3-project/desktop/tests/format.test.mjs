/**
 * @file Tests for the admin screens' date and money formats.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatDate, formatMoney } from '../src/renderer/lib/format.mjs';

test('formats a calendar date as in the mockups', () => {
  assert.equal(formatDate('2026-07-12'), 'Jul 12, 2026');
});

test('keeps the calendar date on the first of a month', () => {
  // A local-time parse would move this to Dec 31 west of UTC.
  assert.equal(formatDate('2026-01-01'), 'Jan 1, 2026');
});

test('formats whole dollars with a thousands separator', () => {
  assert.equal(formatMoney(149), '$149');
  assert.equal(formatMoney(1149), '$1,149');
});

test('shows both cent digits for an amount with cents', () => {
  assert.equal(formatMoney(139.5), '$139.50');
});
