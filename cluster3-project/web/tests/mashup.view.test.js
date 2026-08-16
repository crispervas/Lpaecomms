/**
 * @file Mashups page tests.
 *
 * The page fetches nothing on the server — every card requests its own data
 * from /api/v1 in the browser — so nothing here is stubbed.
 *
 * Two kinds of assertion live in this file, and the difference matters when one
 * of them breaks:
 *
 * The element-id assertions are a contract, not a description. `mashup-map.js`,
 * `mashup-currency.js` and `mashup-password.js` reach into this page by id; a
 * rename that reads as a harmless markup tidy-up leaves the page rendering
 * perfectly and every mashup dead, with nothing failing on the server to say
 * so. They passed before the mockup rebuild and must keep passing after it.
 *
 * The layout and palette assertions are the rebuild itself: the mockup's card
 * puts the copy and the data-source panel above the live widget, and the page
 * was the last one still on the retired slate palette.
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

test('the Mashups page opens with the mockup heading', async () => {
  const response = await request(createApp()).get('/mashup');

  assert.equal(response.status, 200);
  assert.match(response.text, /Integrations, built on one API/);
  assert.match(response.text, /<h1[^>]*>\s*Mashups/);
});

test('every card names what it combines', async () => {
  const response = await request(createApp()).get('/mashup');

  assert.match(response.text, /Catalogue \+ Maps/);
  assert.match(response.text, /Catalogue \+ Exchange rates/);
  assert.match(response.text, /Registration \+ Breach data/);
});

test('each card lists the endpoint it calls', async () => {
  const response = await request(createApp()).get('/mashup');

  // The panel replaces the mockup's "Included files" list. These are the rows
  // documented as content sources in documentation/Mashups.md, section 37.
  assert.match(response.text, /Data sources/);
  assert.match(response.text, /GET \/api\/v1\/products/);
  assert.match(response.text, /GET \/api\/v1\/convert/);
  assert.match(response.text, /GET \/api\/v1\/password\/breaches/);
});

test('each card credits the external service behind it', async () => {
  const response = await request(createApp()).get('/mashup');

  assert.match(response.text, /OpenStreetMap/);
  assert.match(response.text, /API Ninjas/);
  assert.match(response.text, /Have I Been Pwned/);
});

test('the live widget sits below the copy in every card', async () => {
  const response = await request(createApp()).get('/mashup');

  // The mockup's card is read left to right, then down: what the mashup is and
  // what it consumes come first, the thing you interact with last. Asserting
  // the order is what separates this layout from the widget-first one it
  // replaced — both render all the same elements.
  const cards = [
    { title: 'Products + Location', widget: 'id="mashup-map"' },
    { title: 'Products + Currency Converter', widget: 'id="mashup-product"' },
    { title: 'Secure Password Checker', widget: 'id="mashup-password"' },
  ];

  for (const { title, widget } of cards) {
    const titleAt = response.text.indexOf(title);
    const sourcesAt = response.text.indexOf('Data sources', titleAt);
    const widgetAt = response.text.indexOf(widget);

    assert.ok(titleAt > -1, `${title} renders`);
    assert.ok(widgetAt > -1, `the widget for ${title} renders`);
    // Checked explicitly: a missing panel makes indexOf return -1, which would
    // satisfy the ordering assertion below and let this test pass on a page
    // that has no data-source panel at all.
    assert.ok(sourcesAt > -1, `${title} has a data-source panel`);
    assert.ok(sourcesAt < widgetAt, `${title} lists its sources above the widget`);
  }
});

test('the page keeps every element id the mashup scripts bind to', async () => {
  const response = await request(createApp()).get('/mashup');

  // Sorted by the script that owns them. Losing any one of these breaks a
  // mashup silently — the page still renders, the integration just never runs.
  const ids = [
    'mashup-map',
    'mashup-product',
    'mashup-currency',
    'mashup-base-price',
    'mashup-converted-price',
    'mashup-convert-status',
    'mashup-password',
    'mashup-strength-bar',
    'mashup-strength-label',
    'mashup-breach-status',
  ];

  for (const id of ids) {
    assert.match(response.text, new RegExp(`id="${id}"`), `#${id} is still in the page`);
  }
});

test('the strength meter still offers four segments to paint', async () => {
  const response = await request(createApp()).get('/mashup');

  // mashup-password.js paints `bar.children` by index up to a score of 4. It
  // adds no elements, so a meter rebuilt with three segments would quietly cap
  // the strongest password at three quarters.
  const meter = response.text.match(/id="mashup-strength-bar"[\s\S]*?<\/div>/);

  assert.ok(meter, 'the strength meter renders');
  assert.equal(meter[0].match(/<span/g).length, 4);
});

test('the page carries no class from the retired palette', async () => {
  const response = await request(createApp()).get('/mashup');

  // The rest of the site moved to the design tokens; this page was the last
  // one holding the old Tailwind palette, chrome and accents alike.
  assert.doesNotMatch(response.text, /slate-/);
  assert.doesNotMatch(response.text, /blue-/);
  assert.doesNotMatch(response.text, /violet-/);
  assert.doesNotMatch(response.text, /emerald-/);
});

test('the page sells nothing: the mockup priced its bundles, these are integrations', async () => {
  const response = await request(createApp()).get('/mashup');

  // The mockup this layout comes from is a product page — three peripheral
  // bundles at $349/$429/$389 with an Add button. Only its shell was reused.
  assert.doesNotMatch(response.text, /Add Marshup/);
  assert.doesNotMatch(response.text, /Included files/);
});
