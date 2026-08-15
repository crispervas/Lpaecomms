/**
 * @file Product detail page view tests.
 *
 * Every test stubs `globalThis.fetch`: the route wires its own model against
 * the production feed and no test may reach it. The shared `afterEach` also
 * clears the model cache, so one test's stubbed response can never answer the
 * next test's request.
 *
 * This page is the only one that fails outright rather than degrading. The home
 * and catalog pages own content of their own, so losing the feed costs them a
 * section; here the page IS the product, and rendering it without one would
 * claim to describe something that could not be read.
 */

import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { ProductModel } from '../src/models/product.model.js';

/** The real global fetch, restored after every test. */
const realFetch = globalThis.fetch;

/**
 * Answer the single-product request with one record.
 *
 * @param {object} [overrides] - Fields to override on the feed record.
 * @returns {Array<string>} The URLs requested, for assertions.
 */
const stubProduct = (overrides = {}) => {
  const requested = [];

  globalThis.fetch = async (url) => {
    requested.push(url);

    return new Response(
      JSON.stringify({
        id: 7,
        title: 'Wireless Keyboard',
        slug: 'wireless-keyboard',
        price: 120,
        description: 'A keyboard, wirelessly.',
        category: { id: 2, name: 'Electronics', slug: 'electronics' },
        images: ['https://example.test/a.jpg', 'https://example.test/b.jpg', 'https://example.test/c.jpg'],
        ...overrides,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  return requested;
};

afterEach(() => {
  globalThis.fetch = realFetch;
  ProductModel.clearCache();
});

after(async () => {
  await prisma.$disconnect();
});

test('the page renders the product it was asked for', async () => {
  stubProduct();

  const response = await request(createApp()).get('/product/7');

  assert.equal(response.status, 200);
  assert.match(response.text, /<h1[^>]*>\s*Wireless Keyboard/);
  assert.match(response.text, /\$120\.00/);
  assert.match(response.text, /A keyboard, wirelessly\./);
  assert.match(response.text, /Electronics/);
});

test('the gallery shows the first image large and the rest as a strip', async () => {
  stubProduct();

  const response = await request(createApp()).get('/product/7');

  // The first image is the main one and carries the product's name; the rest
  // are decorative repeats of the same subject, so their alt is empty.
  assert.match(response.text, /<img src="https:\/\/example\.test\/a\.jpg" alt="Wireless Keyboard"/);
  assert.match(response.text, /<img src="https:\/\/example\.test\/b\.jpg" alt=""/);
  assert.match(response.text, /<img src="https:\/\/example\.test\/c\.jpg" alt=""/);
});

test('a product with one image renders no thumbnail strip', async () => {
  stubProduct({ images: ['https://example.test/only.jpg'] });

  const response = await request(createApp()).get('/product/7');

  assert.match(response.text, /https:\/\/example\.test\/only\.jpg/);
  // A strip of one is not a strip: the image must appear exactly once.
  assert.equal(response.text.match(/example\.test\/only\.jpg/g).length, 1);
});

test('the breadcrumb links back to the product category and marks the last crumb', async () => {
  stubProduct();

  const response = await request(createApp()).get('/product/7');

  assert.match(response.text, /aria-label="Breadcrumb"/);
  assert.match(response.text, /href="\/catalog\?category=electronics"/);
  assert.match(response.text, /aria-current="page"[^>]*>\s*Wireless Keyboard/);
});

test('the purchase controls render and are all disabled', async () => {
  stubProduct();

  const response = await request(createApp()).get('/product/7');

  assert.match(response.text, /Add to cart — \$120\.00/);

  // Counting disabled buttons page-wide would also count the footer's
  // newsletter button, so this reads the add-to-cart button's own opening tag:
  // the text of a button that lost `disabled` would still match above.
  const beforeLabel = response.text.split('Add to cart')[0];
  const addToCartTag = beforeLabel.slice(beforeLabel.lastIndexOf('<button'));
  assert.match(addToCartTag, /disabled/);

  // The stepper's two buttons are inert for the same reason.
  const stepper = response.text.match(/<button[^>]*aria-label="(?:Decrease|Increase) quantity"[^>]*>/g);
  assert.equal(stepper.length, 2);
  stepper.forEach((tag) => assert.match(tag, /disabled/));
});

test('a product that does not exist answers 404', async () => {
  // The feed answers 400 for an unknown id.
  globalThis.fetch = async () => new Response('no such product', { status: 400 });

  const response = await request(createApp()).get('/product/999999');

  assert.equal(response.status, 404);
});

test('a non-numeric id answers 404 without asking the feed', async () => {
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const response = await request(createApp()).get('/product/not-a-number');

  assert.equal(response.status, 404);
  // An id that cannot name a product is not worth a request to a third party.
  assert.equal(requested.length, 0);
});

test('an unreadable feed reaches the error page, not an empty product', async () => {
  globalThis.fetch = async () => new Response('upstream is down', { status: 503 });

  const response = await request(createApp()).get('/product/7');

  // Deliberately unlike the home and catalog pages: this page is the product.
  assert.equal(response.status, 500);
  assert.doesNotMatch(response.text, /<h1[^>]*>\s*Wireless Keyboard/);
});
