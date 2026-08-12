/**
 * @file Header and footer tests.
 *
 * Driven through About, which needs no model, so the chrome is asserted
 * independently of any page's data. The inertness assertions matter as much as
 * the visual ones: the search field and the cart exist for parity with the
 * mockup, and a regression that turns either into a working-looking control
 * would offer the user something the site cannot do.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

after(async () => {
  await prisma.$disconnect();
});

test('the header renders the two-line brand lockup', async () => {
  const response = await request(createApp()).get('/about');

  assert.equal(response.status, 200);
  assert.match(response.text, /LPA</);
  assert.match(response.text, /ECOMMS</);
});

test('the header marks the active link with the accent underline', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /border-accent[^"]*"[^>]*>\s*About/);
});

test('the header search field is present but inert', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /<input[^>]*type="search"[^>]*disabled/);
});

test('the header cart is not a link and is out of the tab order', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /aria-disabled="true"/);
  assert.doesNotMatch(response.text, /href="\/cart"/);
});
