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
  // Harmless while disabled, and it is one attribute now versus a real defect
  // the day search is switched on.
  assert.match(response.text, /<input[^>]*type="search"[^>]*aria-label="Search products"/);
});

test('the header cart is hidden from assistive technology and is not a link', async () => {
  const response = await request(createApp()).get('/about');

  // aria-disabled is only honoured on elements with a widget role, which a
  // <span> does not have, so the cart is hidden from assistive technology
  // outright instead — the badge conveys nothing actionable yet.
  assert.match(response.text, /<span aria-hidden="true" title="Coming soon"/);
  assert.doesNotMatch(response.text, /aria-disabled/);
  assert.doesNotMatch(response.text, /href="\/cart"/);
});

test('the footer renders the four mockup columns', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /Shop</);
  assert.match(response.text, /Company</);
  assert.match(response.text, /Stay in the loop</);
  assert.match(response.text, /Desk peripherals designed for daily use/);
});

test('the newsletter is inert and submits nowhere', async () => {
  const response = await request(createApp()).get('/about');

  // No <form> at all: a form element implies a submission this site cannot
  // perform, and a disabled button alone would still leave the input enabled.
  assert.doesNotMatch(response.text, /<form/);
  assert.match(response.text, /<input[^>]*type="email"[^>]*disabled/);
});
