/**
 * @file Appearance contract between the server and the stylesheet.
 *
 * `src/lib/preferences.js` declares `THEMES` and `TEXT_SIZES` as the whitelists
 * that decide what a visitor may request. The stylesheet is the other half of
 * that contract: it is the one that actually renders a theme or a text size, and
 * nothing before this test checked that the two agree. Add a theme to the LESS
 * without adding it to `THEMES` and it is unreachable — no attribute value ever
 * selects it. Remove a theme from the LESS and leave it in `THEMES` and the site
 * offers a choice that silently renders as the default, which is a worse bug
 * because it never throws and never looks wrong at a glance.
 *
 * `daylight` and `normal` are excluded from the stylesheet side of the
 * comparison on purpose: they are the states that exist by absence rather than
 * by declaration — `daylight` is whatever `:root` already publishes, and
 * `normal` is the base `html { font-size: 100% }` — so neither has a
 * `html[data-theme="..."]` or `html[data-text-size="..."]` block to find.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEXT_SIZES, THEMES } from '../src/lib/preferences.js';

/** Absolute path to the themes stylesheet. */
const THEMES_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'styles',
  'less',
  'abstracts',
  '_themes.less',
);

/** Absolute path to the typography stylesheet. */
const TYPOGRAPHY_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'styles',
  'less',
  'base',
  '_typography.less',
);

/**
 * Names captured out of every occurrence of a one-argument attribute selector.
 *
 * @param {string} source - LESS source to scan.
 * @param {RegExp} pattern - Global pattern with one capture group for the name.
 * @returns {Set<string>} Distinct names found, in no particular order.
 */
function namesIn(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

/**
 * Compare two sets of names and describe any mismatch as an actionable sentence
 * rather than a bare "sets differ", naming which side has the surplus.
 *
 * @param {Set<string>} declared - Names the server whitelists (defaults removed).
 * @param {Set<string>} rendered - Names the stylesheet actually renders.
 * @param {string} declaredLabel - What to call the server-side list in a message.
 * @param {string} renderedLabel - What to call the stylesheet-side list in a message.
 * @returns {string[]} Human-readable mismatch descriptions; empty when equal.
 */
function describeMismatch(declared, rendered, declaredLabel, renderedLabel) {
  const onlyDeclared = [...declared].filter((name) => !rendered.has(name));
  const onlyRendered = [...rendered].filter((name) => !declared.has(name));
  const problems = [];

  if (onlyDeclared.length > 0) {
    problems.push(
      `${declaredLabel} lists ${onlyDeclared.join(', ')} but ${renderedLabel} has no block for ` +
        `${onlyDeclared.length === 1 ? 'it' : 'them'} — unreachable, add the stylesheet block or drop the entry`,
    );
  }

  if (onlyRendered.length > 0) {
    problems.push(
      `${renderedLabel} has a block for ${onlyRendered.join(', ')} that ${declaredLabel} does not list — ` +
        `add ${onlyRendered.length === 1 ? 'it' : 'them'} to the whitelist or the block silently renders as the default`,
    );
  }

  return problems;
}

test('THEMES matches the html[data-theme] blocks in _themes.less', () => {
  const source = fs.readFileSync(THEMES_FILE, 'utf8');
  const rendered = namesIn(source, /html\[data-theme="([\w-]+)"\]/g);
  const declared = new Set(THEMES.filter((name) => name !== 'daylight'));

  const problems = describeMismatch(declared, rendered, 'THEMES', '_themes.less');

  assert.deepEqual(problems, []);
});

test('TEXT_SIZES matches the html[data-text-size] rules in _typography.less', () => {
  const source = fs.readFileSync(TYPOGRAPHY_FILE, 'utf8');
  const rendered = namesIn(source, /html\[data-text-size="([\w-]+)"\]/g);
  const declared = new Set(TEXT_SIZES.filter((name) => name !== 'normal'));

  const problems = describeMismatch(declared, rendered, 'TEXT_SIZES', '_typography.less');

  assert.deepEqual(problems, []);
});
