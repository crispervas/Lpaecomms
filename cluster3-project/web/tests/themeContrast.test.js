/**
 * @file Theme contrast floors.
 *
 * Reads the raw values out of _palette.less and measures every pairing the
 * interface actually draws, so a colour that fails WCAG cannot reach a page.
 * This is the difference between claiming the themes are legible and knowing
 * it: the ratios are computed here, not estimated by eye.
 *
 * Text pairings are held to AA (4.5:1) and control boundaries to the 3:1 that
 * WCAG 1.4.11 requires of a border that identifies a control. The password
 * meter's bars are deliberately not checked: the meter states its level in
 * words beside the bars, and that label is checked, so the bar colour is
 * redundant rather than load-bearing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the palette source. */
const PALETTE_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'styles',
  'less',
  'abstracts',
  '_palette.less',
);

/** Matches `@name-value: #RRGGBB;`, ignoring the rgba entries. */
const VALUE_PATTERN = /@([a-z0-9-]+)-value:\s*(#[0-9a-fA-F]{6})\s*;/g;

/**
 * Read every hex value declared in the palette, keyed by token name.
 *
 * Parses the LESS source rather than the compiled CSS so the suite never
 * depends on `pnpm build:css` having been run.
 *
 * @returns {Record<string, string>} Token name to hex value.
 */
function readPalette() {
  const source = fs.readFileSync(PALETTE_FILE, 'utf8');
  const values = {};

  for (const [, name, hex] of source.matchAll(VALUE_PATTERN)) {
    values[name] = hex;
  }

  return values;
}

/**
 * Relative luminance of a colour, per WCAG 2.1.
 *
 * @param {string} hex - A `#RRGGBB` colour.
 * @returns {number} Relative luminance between 0 and 1.
 */
function luminance(hex) {
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Contrast ratio between two colours, per WCAG 2.1.
 *
 * @param {string} foreground - A `#RRGGBB` colour.
 * @param {string} background - A `#RRGGBB` colour.
 * @returns {number} A ratio between 1 and 21.
 */
function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG 2.1 floors. */
const AA_TEXT = 4.5;
const AAA_TEXT = 7;
const NON_TEXT = 3;

/**
 * Every pairing the interface draws, named as a reader would describe it so a
 * failure reads as a sentence about the page rather than a pair of tokens.
 */
const PAIRINGS = [
  { what: 'body text on the canvas', fg: 'ink', bg: 'canvas', floor: AA_TEXT },
  { what: 'body text on a card', fg: 'ink', bg: 'surface', floor: AA_TEXT },
  { what: 'secondary text on the canvas', fg: 'muted', bg: 'canvas', floor: AA_TEXT },
  { what: 'secondary text on a card', fg: 'muted', bg: 'surface', floor: AA_TEXT },
  { what: 'secondary text on a subtle panel', fg: 'muted', bg: 'subtle', floor: AA_TEXT },
  { what: 'label on a solid button', fg: 'on-ink', bg: 'ink', floor: AA_TEXT },
  { what: 'label on an accent surface', fg: 'on-accent', bg: 'accent', floor: AA_TEXT },
  { what: 'a link on the canvas', fg: 'accent', bg: 'canvas', floor: AA_TEXT },
  { what: 'a link on a card', fg: 'accent', bg: 'surface', floor: AA_TEXT },
  { what: 'a link on a tint panel', fg: 'accent', bg: 'tint', floor: AA_TEXT },
  { what: 'an input border on the canvas', fg: 'border-control', bg: 'canvas', floor: NON_TEXT },
  { what: 'an input border on a card', fg: 'border-control', bg: 'surface', floor: NON_TEXT },
  { what: 'an errored input border', fg: 'danger-border', bg: 'surface', floor: NON_TEXT },
  { what: 'an error message', fg: 'danger-text', bg: 'surface', floor: AA_TEXT },
  { what: 'a success message', fg: 'success-text', bg: 'surface', floor: AA_TEXT },
  { what: 'a warning message', fg: 'warning-text', bg: 'warning-bg', floor: AA_TEXT },
  { what: 'the weakest strength label', fg: 'strength-1-text', bg: 'surface', floor: AA_TEXT },
  { what: 'the strongest strength label', fg: 'strength-4-text', bg: 'surface', floor: AA_TEXT },
];

/**
 * Themes by name, each mapping a token to the palette entry it reads. A theme
 * that does not override a token inherits the default one, which is what the
 * spread expresses.
 *
 * Task 3 adds midnight, forest and contrast here.
 */
function themes(palette) {
  return { daylight: palette };
}

for (const [name, resolved] of Object.entries(themes(readPalette()))) {
  for (const { what, fg, bg, floor } of PAIRINGS) {
    test(`${name}: ${what} clears ${floor}:1`, () => {
      const foreground = resolved[fg];
      const background = resolved[bg];

      assert.ok(foreground, `${name} has no value for ${fg}`);
      assert.ok(background, `${name} has no value for ${bg}`);

      const ratio = contrastRatio(foreground, background);

      assert.ok(
        ratio >= floor,
        `${what} measures ${ratio.toFixed(2)}:1 (${foreground} on ${background}), below ${floor}:1`,
      );
    });
  }
}
