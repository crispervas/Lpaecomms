/**
 * @file Tailwind theme tests.
 *
 * The palette and the two font families come straight from the home mockup and
 * are the contract every template styles against. Asserting them here catches a
 * renamed or dropped token at test time rather than as a silently unstyled page:
 * Tailwind emits no error for a class whose colour does not exist.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import config from '../tailwind.config.js';

test('the theme carries the mockup palette', () => {
  const { colors } = config.theme.extend;

  assert.equal(colors.canvas, '#FAFAF8');
  assert.equal(colors.surface, '#FFFFFF');
  assert.equal(colors.subtle, '#F1F0EC');
  assert.equal(colors.ink, '#14161A');
  assert.equal(colors.muted, '#6B6F76');
  assert.equal(colors.line.DEFAULT, '#E7E5DF');
  assert.equal(colors.line.strong, '#D8D6CF');
  assert.equal(colors.accent.DEFAULT, '#2F5EFB');
  assert.equal(colors.accent.strong, '#1F45D6');
  assert.equal(colors.tint, '#EEF1FF');
});

test('the theme declares both mockup font families', () => {
  const { fontFamily } = config.theme.extend;

  assert.match(fontFamily.display[0], /Space Grotesk/);
  assert.match(fontFamily.sans[0], /IBM Plex Sans/);
});

test('the content globs still scan the EJS views', () => {
  // Dropping this glob is the classic Tailwind-with-EJS failure: classes used
  // only inside templates are scanned out and the site renders unstyled.
  assert.ok(config.content.includes('./src/views/**/*.ejs'));
});
