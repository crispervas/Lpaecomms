/**
 * @file Session cookie helpers: lifetime parsing and the post-login redirect guard.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SESSION_COOKIE, parseDuration, safeNext, sessionCookieOptions } from '../src/lib/session.js';

test('safeNext keeps a same-site path', () => {
  assert.equal(safeNext('/checkout/shipping'), '/checkout/shipping');
  assert.equal(safeNext('/catalog?q=dock'), '/catalog?q=dock');
});

test('safeNext refuses anything that could leave the site', () => {
  for (const raw of ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '', undefined, ['/a'], '/%2F/evil.com'.replace('%2F', '/')]) {
    assert.equal(safeNext(raw), '/account', String(raw));
  }
});

test('parseDuration reads jsonwebtoken lifetimes as milliseconds', () => {
  assert.equal(parseDuration('1h'), 3_600_000);
  assert.equal(parseDuration('30m'), 1_800_000);
  assert.equal(parseDuration('7d'), 604_800_000);
  assert.equal(parseDuration('900'), 900_000);
  assert.equal(parseDuration(900), 900_000);
});

test('parseDuration refuses a lifetime it cannot read', () => {
  assert.throws(() => parseDuration('soon'));
});

test('the session cookie is httpOnly, lax and secure only in production', () => {
  assert.equal(SESSION_COOKIE, 'lpa_session');
  const dev = sessionCookieOptions(false);
  assert.deepEqual(
    { httpOnly: dev.httpOnly, sameSite: dev.sameSite, secure: dev.secure, path: dev.path },
    { httpOnly: true, sameSite: 'lax', secure: false, path: '/' },
  );
  assert.equal(typeof dev.maxAge, 'number');
  assert.equal(sessionCookieOptions(true).secure, true);
});
