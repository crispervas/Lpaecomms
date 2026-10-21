/**
 * @file Same-origin guard for the site's form posts: a cross-site form must
 * not be able to log a visitor in, out, or change their cart or profile.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requireSameOrigin } from '../src/middlewares/sameOrigin.js';

/**
 * Run the guard on a request built from a method and headers.
 *
 * @param {string} method - HTTP method.
 * @param {Record<string, string>} headers - Lower-case request headers.
 * @returns {unknown} What the guard passed to `next` (undefined when it let the request through).
 */
function run(method, headers) {
  const req = { method, get: (name) => headers[name.toLowerCase()] };
  let passed = 'not called';
  requireSameOrigin(req, {}, (err) => { passed = err; });
  return passed;
}

const HOST = { host: 'shop.example.com' };

test('reads always pass', () => {
  assert.equal(run('GET', { ...HOST, origin: 'https://evil.example' }), undefined);
});

test('a post from the site itself passes', () => {
  assert.equal(run('POST', { ...HOST, origin: 'https://shop.example.com' }), undefined);
  assert.equal(run('POST', { ...HOST, 'sec-fetch-site': 'same-origin' }), undefined);
});

test('a post from another site is a 403', () => {
  for (const headers of [
    { ...HOST, origin: 'https://evil.example' },
    { ...HOST, origin: 'null' },
    { ...HOST, 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' },
    { ...HOST, 'sec-fetch-site': 'same-site', origin: 'https://other.example.com' },
  ]) {
    assert.equal(run('POST', headers)?.output?.statusCode, 403, JSON.stringify(headers));
  }
});

test('a post with no browser origin headers passes, since only browsers forge for others', () => {
  assert.equal(run('POST', HOST), undefined);
});
