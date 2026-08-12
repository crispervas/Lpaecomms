/**
 * @file Base layout tests.
 *
 * Drives a page with no external dependencies — About needs no model — so these
 * assertions describe the document shell alone and cannot fail for reasons that
 * belong to the home page's catalogue feed.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// The app imports the shared Prisma client, which builds a connection pool at
// import time. Closing it lets the test process exit instead of hanging.
after(async () => {
  await prisma.$disconnect();
});

test('every page loads the mockup web fonts', async () => {
  const response = await request(createApp()).get('/about');

  assert.equal(response.status, 200);
  assert.match(response.text, /fonts\.googleapis\.com/);
  assert.match(response.text, /Space\+Grotesk/);
  assert.match(response.text, /IBM\+Plex\+Sans/);
});

test('the document body paints the mockup canvas and ink', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /<body class="[^"]*bg-canvas[^"]*"/);
  assert.match(response.text, /<body class="[^"]*text-ink[^"]*"/);
  assert.match(response.text, /<body class="[^"]*font-sans[^"]*"/);
});
