/**
 * @file Persistent cookie attribute tests.
 *
 * `secure` is the one security-relevant branch in `persistentCookieOptions`:
 * get it wrong and the appearance cookie (and anything else built on this
 * helper) travels over plain HTTP in production. `isProduction` is an
 * injectable parameter precisely so this branch can be asserted directly,
 * without mutating `NODE_ENV` around the test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PERSISTENT_COOKIE_MAX_AGE_MS,
  persistentCookieOptions,
} from '../src/config/cookies.js';

test('secure is false by default in this environment', () => {
  const options = persistentCookieOptions();

  assert.equal(options.secure, false);
});

test('secure is true when production is requested', () => {
  const options = persistentCookieOptions(true);

  assert.equal(options.secure, true);
});

test('the remaining attributes are what a persistent preference cookie needs', () => {
  const options = persistentCookieOptions();

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.equal(options.maxAge, PERSISTENT_COOKIE_MAX_AGE_MS);
  assert.equal(options.maxAge, 365 * 24 * 60 * 60 * 1000);
});
