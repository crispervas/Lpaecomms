/**
 * @file Cross-cutting API request handling: CORS preflight and body parsing.
 *
 * Both run before any route, so they are tested through the assembled app
 * against a path whose route may not exist yet.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

after(async () => {
  await prisma.$disconnect();
});

test('an API CORS preflight is answered 204 with the CORS headers', async () => {
  const response = await request(createApp())
    .options('/api/v1/contact')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], '*');
  assert.match(response.headers['access-control-allow-methods'], /POST/);
  assert.match(response.headers['access-control-allow-headers'], /Content-Type/i);
});

test('a malformed JSON body to the API answers 400, not 500', async () => {
  const response = await request(createApp())
    .post('/api/v1/contact')
    .set('Content-Type', 'application/json')
    .send('{"name":');

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'The request body is not valid JSON.');
});
