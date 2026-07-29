/**
 * @file Breached password lookup API tests.
 *
 * The upstream Have I Been Pwned range API is replaced by a stub on
 * `globalThis.fetch`. The stub's body includes a zero-count padding entry and a
 * negative-count entry so the test proves both are stripped before the
 * response leaves the service — a real breach count is never zero or negative.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

/**
 * Two real suffixes and two decoys, in the upstream's text format: one
 * zero-count padding line and one negative-count line (not a shape the real
 * upstream sends today, but the parser must not trust that it never will).
 */
const RANGE_BODY = [
  '003D68EB55068C33ACE09247EE4C639306B:3',
  '012C192B2F16F82EA0EB9EF18D9D539B0DD:2',
  '0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0:0',
  'A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A:-5',
].join('\r\n');

afterEach(() => {
  globalThis.fetch = realFetch;
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /api/v1/password/breaches returns the suffix map without padding entries', async () => {
  globalThis.fetch = async () => new Response(RANGE_BODY, { status: 200 });

  const response = await request(createApp()).get('/api/v1/password/breaches?prefix=5BAA6');

  assert.equal(response.status, 200);
  assert.equal(response.body.prefix, '5BAA6');
  assert.equal(response.body.count, 2);
  assert.equal(response.body.suffixes['003D68EB55068C33ACE09247EE4C639306B'], 3);
  assert.equal(response.body.suffixes['0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0'], undefined);
  // A negative count is not a real breach entry either; it must not survive
  // alongside the zero-count decoy above.
  assert.equal(response.body.suffixes['A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A'], undefined);
});

test('GET /api/v1/password/breaches rejects a malformed prefix', async () => {
  const response = await request(createApp()).get('/api/v1/password/breaches?prefix=NOTHEX');

  assert.equal(response.status, 400);
});

test('GET /api/v1/password/breaches answers 502 when the upstream fails', async () => {
  globalThis.fetch = async () => new Response('down', { status: 503 });

  const response = await request(createApp()).get('/api/v1/password/breaches?prefix=5BAA6');

  assert.equal(response.status, 502);
});
