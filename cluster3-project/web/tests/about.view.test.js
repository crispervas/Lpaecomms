/**
 * @file About page tests.
 *
 * The About page reads no model and issues no request, so nothing here is
 * stubbed — the only view test file in this suite for which that is true.
 *
 * The video assertions are the reason this file exists. The embed predates the
 * redesign and was the one element the owner asked to carry through it, so its
 * source, its accessible name and its lazy loading are pinned rather than
 * trusted to survive a rewrite of the markup around them.
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

test('the About page keeps the Mashup explainer video', async () => {
  const response = await request(createApp()).get('/about');

  assert.equal(response.status, 200);
  assert.match(
    response.text,
    /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/ZRcP2CZ8DS8"/,
  );
  // The title is what names the frame for assistive technology; losing it is
  // the quiet way this embed would degrade.
  assert.match(response.text, /<iframe[^>]*title="What does Mashup mean\?"/);
  assert.match(response.text, /<iframe[^>]*loading="lazy"/);
});

test('the video section leads on to the Mashups page', async () => {
  const response = await request(createApp()).get('/about');

  // Matched through the link text, not the href alone: the header nav already
  // points at /mashup, so an href-only assertion would pass without this link
  // existing at all.
  assert.match(response.text, /href="\/mashup"[^>]*>\s*See the Mashups/);
});

test('the About page opens with the mission statement', async () => {
  const response = await request(createApp()).get('/about');

  assert.equal(response.status, 200);
  assert.match(response.text, /Our mission/);
  assert.match(
    response.text,
    /<h1[^>]*>\s*The hardware between you and your work should get out of the way\./,
  );
});

test('the story explains the store and the shared catalogue', async () => {
  const response = await request(createApp()).get('/about');

  assert.match(response.text, /A catalogue that stays the same everywhere/);
  assert.match(response.text, /keyboards, mice, headsets, webcams/);
  assert.match(response.text, /It is one store, not three\./);
});

test('the platform panel lists the API and its clients', async () => {
  const response = await request(createApp()).get('/about');

  // A description list, not a grid of divs: each row is a term and its
  // description, which is what they are, and it linearises correctly.
  assert.match(response.text, /<dl/);
  assert.match(response.text, /One REST API/);
  // The mobile app does not exist yet. Saying so is deliberate, and this
  // assertion is what stops a later edit from quietly announcing a shipped app.
  assert.match(response.text, /Apps in progress on that same API\./);
});

test('the retired feature cards are gone', async () => {
  const response = await request(createApp()).get('/about');

  // "Simple checkout" promised a checkout this site does not have, and
  // "Live stock" a synchronisation it does not perform. The panel replaced all
  // three cards with statements that are true today.
  assert.doesNotMatch(response.text, /Simple checkout/);
  assert.doesNotMatch(response.text, /Live stock/);
});

test('the page carries no class from the retired slate palette', async () => {
  const response = await request(createApp()).get('/about');

  // The header, footer and base layout are already free of it, so this covers
  // the whole rendered document and not just this page's body.
  assert.doesNotMatch(response.text, /slate-/);
});
