/**
 * @file Home page view tests.
 *
 * `resolveHeroImage` is exercised against a temporary directory rather than the
 * real one because the hero photograph is supplied by hand and may or may not
 * be in the tree; a test that depended on that file would pass or fail for
 * reasons unrelated to the code.
 *
 * `GET /` now reads the catalogue through `ProductModel`, so every test that
 * drives it stubs `globalThis.fetch` — none may reach the real feed. The
 * shared `afterEach` restores `fetch` and clears `ProductModel`'s cache after
 * every test in this file: the home route wires its own model against the
 * production catalogue URL, so a cache entry left by one test would otherwise
 * answer the next test's stub instead of the stub itself.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resolveHeroImage } from '../src/controllers/home.controller.js';
import { ProductModel } from '../src/models/product.model.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

/**
 * Answer the next fetch with `count` products, in the shape the external
 * catalogue returns. Centralised so the same `new Response(JSON.stringify(...))`
 * block does not repeat across every test that drives `GET /`.
 *
 * @param {number} [count] - How many feed records to generate.
 * @returns {void}
 */
const stubFeaturedFeed = (count = 8) => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify(
        Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          title: `Product ${i + 1}`,
          price: 10,
          images: [`https://example.test/${i + 1}.jpg`],
          category: { id: 1, name: 'Keyboards' },
        })),
      ),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
};

afterEach(() => {
  globalThis.fetch = realFetch;
  // The home route wires its own model against the production catalogue URL, so
  // one test's cached response would otherwise answer the next test's stub.
  ProductModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('the hero renders its headline and both calls to action', async () => {
  stubFeaturedFeed();

  const response = await request(createApp()).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Peripherals engineered for focus\./);
  // Both destinations exist today: the anchor is on this page, the mashups
  // page is a real route.
  assert.match(response.text, /href="#trending"/);
  assert.match(response.text, /href="\/mashup"/);
});

test('resolveHeroImage returns the first supplied asset', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-'));

  try {
    fs.writeFileSync(path.join(dir, 'hero-product.jpg'), '');

    assert.equal(resolveHeroImage(dir), '/img/hero-product.jpg');
  } finally {
    // Runs even when the assertion throws, so a failing test never leaks its
    // temp directory into the OS temp folder.
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveHeroImage prefers webp over the other formats', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-'));

  try {
    fs.writeFileSync(path.join(dir, 'hero-product.png'), '');
    fs.writeFileSync(path.join(dir, 'hero-product.webp'), '');

    assert.equal(resolveHeroImage(dir), '/img/hero-product.webp');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveHeroImage returns null when no asset was supplied', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-'));

  try {
    assert.equal(resolveHeroImage(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the home page lists the six mockup categories', async () => {
  stubFeaturedFeed();

  const response = await request(createApp()).get('/');

  assert.match(response.text, /Shop by category/);
  for (const name of ['Keyboards', 'Mice', 'Headsets', 'Monitors', 'Webcams', 'Docks']) {
    assert.match(response.text, new RegExp(`>\\s*${name}\\s*<`));
  }
});

test('category cards render as plain divs, not links, while category filtering does not exist', async () => {
  stubFeaturedFeed();

  const response = await request(createApp()).get('/');

  // Scoped to the category grid itself: the header nav legitimately links to
  // /catalog now that the page exists (Task 4), but the cards stay unlinked
  // until Task 5 wires category filtering onto that page.
  const categorySection = response.text.split('Shop by category')[1].split('Trending now')[0];
  assert.doesNotMatch(categorySection, /<a\b/);
});

test('the trending section renders the featured products', async () => {
  stubFeaturedFeed();

  const response = await request(createApp()).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Trending now/);
  assert.match(response.text, /id="trending"/);
  assert.match(response.text, /Product 8/);
  // Formatted through Intl in en-AU, not concatenated from the raw number.
  assert.match(response.text, /\$10\.00/);
});

test('the home page shows a fallback notice when the feed fails', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const response = await request(createApp()).get('/');

  // The page must still answer 200: a third-party feed being down is not a
  // reason for the storefront to fail.
  assert.equal(response.status, 200);
  // The section itself never disappears: the hero's "#trending" anchor must
  // always have a destination to scroll to, feed or no feed.
  assert.match(response.text, /id="trending"/);
  assert.match(response.text, /Our catalogue is unavailable right now\. Please check back shortly\./);
  // No product card renders — only a card produces an <article>, so its
  // absence proves the grid gave way to the notice rather than an empty grid.
  assert.doesNotMatch(response.text, /<article/);
  // The rest of the page is untouched.
  assert.match(response.text, /Peripherals engineered for focus\./);
});
