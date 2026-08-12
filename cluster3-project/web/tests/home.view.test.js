/**
 * @file Home page view tests.
 *
 * `resolveHeroImage` is exercised against a temporary directory rather than the
 * real one because the hero photograph is supplied by hand and may or may not
 * be in the tree; a test that depended on that file would pass or fail for
 * reasons unrelated to the code.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resolveHeroImage } from '../src/controllers/home.controller.js';

after(async () => {
  await prisma.$disconnect();
});

test('the hero renders its headline and both calls to action', async () => {
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
  const response = await request(createApp()).get('/');

  assert.match(response.text, /Shop by category/);
  for (const name of ['Keyboards', 'Mice', 'Headsets', 'Monitors', 'Webcams', 'Docks']) {
    assert.match(response.text, new RegExp(`>\\s*${name}\\s*<`));
  }
});

test('category cards are not links while Catalog does not exist', async () => {
  const response = await request(createApp()).get('/');

  assert.doesNotMatch(response.text, /href="\/catalog"/);
});
