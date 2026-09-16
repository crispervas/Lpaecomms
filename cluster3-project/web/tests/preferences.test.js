/**
 * @file Appearance preference rules.
 *
 * The parsed theme is written straight into an HTML attribute, so the whitelist
 * here is the boundary between a cookie anyone can edit and the markup. These
 * tests pin that boundary rather than merely checking the happy path.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PREFERENCES,
  TEXT_SIZES,
  THEMES,
  isSafeReturnPath,
  parsePreferences,
  serialisePreferences,
  validatePreferences,
} from '../src/lib/preferences.js';

test('a well-formed cookie is read back as it was written', () => {
  const parsed = parsePreferences('theme=midnight&text=large');

  assert.deepEqual(parsed, { theme: 'midnight', textSize: 'large' });
});

test('every declared theme and size survives a round trip', () => {
  for (const theme of THEMES) {
    for (const textSize of TEXT_SIZES) {
      const restored = parsePreferences(serialisePreferences({ theme, textSize }));

      assert.deepEqual(restored, { theme, textSize });
    }
  }
});

test('a missing cookie yields the defaults', () => {
  assert.deepEqual(parsePreferences(undefined), DEFAULT_PREFERENCES);
});

test('a malformed cookie yields the defaults instead of throwing', () => {
  for (const raw of ['', 'nonsense', '{"theme":"midnight"}', 'theme', '%%%%']) {
    assert.deepEqual(parsePreferences(raw), DEFAULT_PREFERENCES, `for ${JSON.stringify(raw)}`);
  }
});

test('a theme outside the whitelist falls back rather than reaching the markup', () => {
  // The value is written into <html data-theme="...">, so an unfiltered one
  // would be an injection point, not merely a wrong colour.
  const parsed = parsePreferences('theme="><script>alert(1)</script>&text=large');

  assert.equal(parsed.theme, DEFAULT_PREFERENCES.theme);
  assert.equal(parsed.textSize, 'large');
});

test('one unusable half does not discard the other', () => {
  assert.deepEqual(parsePreferences('theme=forest&text=enormous'), {
    theme: 'forest',
    textSize: DEFAULT_PREFERENCES.textSize,
  });
});

test('a valid submission raises no errors', () => {
  assert.deepEqual(validatePreferences({ theme: 'contrast', text: 'larger' }), {});
});

test('an invalid submission names the field that failed', () => {
  const errors = validatePreferences({ theme: 'neon', text: 'enormous' });

  assert.equal(errors.theme, 'Choose one of the available themes.');
  assert.equal(errors.textSize, 'Choose one of the available text sizes.');
});

test('a missing submission field is an error, not a default', () => {
  // parsePreferences forgives a cookie; a form post is a deliberate act and is
  // told when it did not make sense.
  const errors = validatePreferences({});

  assert.ok(errors.theme);
  assert.ok(errors.textSize);
});

test('a site-relative path is a safe place to return to', () => {
  assert.equal(isSafeReturnPath('/catalog'), true);
  assert.equal(isSafeReturnPath('/product/42?ref=home'), true);
});

test('anything that could leave the site is not', () => {
  const carriageReturn = String.fromCharCode(13);

  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/' + String.fromCharCode(92) + 'evil.example',
    'catalog',
    '',
    undefined,
    null,
    42,
    '/catalog' + carriageReturn + 'Set-Cookie: a=b',
  ]) {
    assert.equal(isSafeReturnPath(value), false, `for ${JSON.stringify(value)}`);
  }
});
