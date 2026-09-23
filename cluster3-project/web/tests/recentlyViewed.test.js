/**
 * @file Browsing history rules.
 *
 * The list drives what the home page recommends, so its order is the meaning:
 * most recent first, each product once. These tests pin that, and pin that a
 * cookie carrying anything else is ignored rather than trusted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RECENT_LIMIT,
  parseRecent,
  pushRecent,
  serialiseRecent,
} from '../src/lib/recentlyViewed.js';

test('a well-formed cookie reads back in order', () => {
  assert.deepEqual(parseRecent('12,7,3'), [12, 7, 3]);
});

test('a missing or malformed cookie is an empty history, not an error', () => {
  for (const raw of [undefined, '', ',,,', 'abc', '[]', '12,,abc,7']) {
    const parsed = parseRecent(raw);

    assert.ok(Array.isArray(parsed), `for ${JSON.stringify(raw)}`);
    assert.ok(parsed.every(Number.isInteger), `for ${JSON.stringify(raw)}`);
  }

  assert.deepEqual(parseRecent(undefined), []);
  assert.deepEqual(parseRecent('abc'), []);
  // The readable ids survive; the rest are dropped rather than failing the lot.
  assert.deepEqual(parseRecent('12,,abc,7'), [12, 7]);
});

test('a cookie with repeated ids yields each once in first-seen order', () => {
  assert.deepEqual(parseRecent('5,3,5,7,3'), [5, 3, 7]);
});

test('repeats followed by distinct ids still fill up to the limit rather than being cut short', () => {
  // Four repeats of 1, then eight further distinct ids: deduping before
  // truncating must still fill the list to RECENT_LIMIT, not stop at
  // whatever survives the repeats.
  const raw = '1,1,1,1,2,3,4,5,6,7,8,9';
  const parsed = parseRecent(raw);

  assert.equal(parsed.length, RECENT_LIMIT);
  assert.deepEqual(parsed, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('parseRecent truncates an over-length cookie to the limit, keeping the leading ids', () => {
  const ids = Array.from({ length: RECENT_LIMIT + 4 }, (_, index) => index + 1);
  const parsed = parseRecent(serialiseRecent(ids));

  assert.equal(parsed.length, RECENT_LIMIT);
  assert.deepEqual(parsed, ids.slice(0, RECENT_LIMIT));
});

test('the newest product goes to the front', () => {
  assert.deepEqual(pushRecent([7, 3], 12), [12, 7, 3]);
});

test('viewing a product again moves it to the front instead of repeating it', () => {
  assert.deepEqual(pushRecent([12, 7, 3], 7), [7, 12, 3]);
});

test('the history stops growing at the limit', () => {
  const full = Array.from({ length: RECENT_LIMIT }, (_, index) => index + 1);
  const pushed = pushRecent(full, 99);

  assert.equal(pushed.length, RECENT_LIMIT);
  assert.equal(pushed[0], 99);
  // The oldest is what falls off the end.
  assert.equal(pushed.includes(RECENT_LIMIT), false);
});

test('re-pushing the oldest id moves it to the front without changing the length', () => {
  const full = Array.from({ length: RECENT_LIMIT }, (_, index) => index + 1);
  // The list is newest-first, so the last index is the oldest slot.
  const oldest = full[full.length - 1];
  const pushed = pushRecent(full, oldest);

  assert.equal(pushed.length, RECENT_LIMIT);
  assert.equal(pushed[0], oldest);
});

test('an id that cannot name a product is not recorded', () => {
  for (const id of [0, -1, 1.5, NaN, '12', undefined, null]) {
    assert.deepEqual(pushRecent([7], id), [7], `for ${JSON.stringify(id)}`);
  }
});

test('a history survives a round trip through the cookie', () => {
  const ids = [12, 7, 3];

  assert.deepEqual(parseRecent(serialiseRecent(ids)), ids);
});
