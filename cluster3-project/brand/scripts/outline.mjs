/**
 * Draws the LPA logo masters into brand/svg/.
 *
 * Every piece of text — the "LPA" wordmark in Space Grotesk Bold and the
 * splash credit in IBM Plex Sans — is converted to vector paths here. The
 * masters therefore render identically on any machine, with no font
 * installed, which is what lets export.mjs rasterise them for every platform.
 *
 * Change the logo here (colours, sizes, credit text), then run `pnpm build`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);

// Brand tokens, mirrored from the mobile theme (--lpa-ink, --lpa-accent, ...).
const INK = '#14161a';
const ON_INK = '#ffffff';
const ACCENT = '#2f5efb';
const CREDIT = '#c9cbcf';
const MUTED = '#9a9c9a';

const CREDIT_NAME = 'Created by Cristhian Pereira';
const CREDIT_ID = 'CTI20260114';

/**
 * Loads one weight of a @fontsource family from its bundled WOFF file.
 *
 * @param {string} family - Package name under @fontsource, e.g. "space-grotesk".
 * @param {number} weight - Font weight, e.g. 700.
 * @returns {opentype.Font} The parsed font.
 * @throws {Error} If the package or weight is not installed.
 */
function loadFont(family, weight) {
  const root = dirname(require.resolve(`@fontsource/${family}/package.json`));
  return opentype.loadSync(join(root, 'files', `${family}-latin-${weight}-normal.woff`));
}

const display = loadFont('space-grotesk', 700);
const body = loadFont('ibm-plex-sans', 500);

/**
 * Draws the logo mark — the "LPA" wordmark over a rounded accent bar —
 * centred on a point.
 *
 * @param {number} width - Width of the wordmark in canvas units.
 * @param {number} cx - Horizontal centre.
 * @param {number} cy - Vertical centre of the whole mark.
 * @returns {string} SVG markup.
 */
function mark(width, cx, cy) {
  const probe = display.getPath('LPA', 0, 0, 100).getBoundingBox();
  const size = (100 * width) / (probe.x2 - probe.x1);
  const path = display.getPath('LPA', 0, 0, size);
  const box = path.getBoundingBox();

  const height = box.y2 - box.y1;
  const barHeight = height * 0.14;
  const gap = height * 0.22;
  const barWidth = width * 0.32;
  const top = cy - (height + gap + barHeight) / 2;
  const tx = cx - (box.x1 + box.x2) / 2;
  const ty = top - box.y1;

  return (
    `<path fill="${ON_INK}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})" d="${path.toPathData(2)}"/>` +
    `<rect fill="${ACCENT}" x="${(cx - barWidth / 2).toFixed(2)}" y="${(top + height + gap).toFixed(2)}" ` +
    `width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="${(barHeight / 2).toFixed(2)}"/>`
  );
}

/**
 * Draws one horizontally centred line of text as a path.
 *
 * @param {string} text - The text to draw.
 * @param {number} size - Font size in canvas units.
 * @param {number} cx - Horizontal centre.
 * @param {number} baseline - Baseline y coordinate.
 * @param {string} fill - Fill colour.
 * @param {number} [tracking=0] - Extra space between letters, in canvas units.
 * @returns {string} SVG markup.
 */
function line(text, size, cx, baseline, fill, tracking = 0) {
  const scale = size / body.unitsPerEm;
  const glyphs = body.stringToGlyphs(text);
  const width = glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth * scale + tracking, -tracking);

  let x = cx - width / 2;
  let d = '';
  for (const glyph of glyphs) {
    d += glyph.getPath(x, baseline, size).toPathData(2);
    x += glyph.advanceWidth * scale + tracking;
  }
  return `<path fill="${fill}" d="${d}"/>`;
}

/**
 * Wraps markup in a square SVG document.
 *
 * @param {number} size - Canvas width and height.
 * @param {string} content - Inner markup.
 * @returns {string} A complete SVG document.
 */
function svg(size, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>\n`;
}

const square = (size, rx = 0) => `<rect width="${size}" height="${size}" rx="${rx}" fill="${INK}"/>`;

const masters = {
  // Full-bleed square: iOS masks it itself, and so do Android's legacy launchers.
  'app-icon.svg': svg(1024, square(1024) + mark(600, 512, 512)),
  // Android adaptive icon. @capacitor/assets insets the foreground by 16.7%,
  // which already keeps the mark inside the launcher's safe zone.
  'app-icon-foreground.svg': svg(1024, mark(600, 512, 512)),
  'app-icon-background.svg': svg(1024, square(1024)),
  // Browsers do not mask favicons, so this one carries its own rounded corners
  // and a larger mark that stays legible at 16 px.
  'favicon.svg': svg(1024, square(1024, 224) + mark(760, 512, 512)),
  // macOS draws desktop icons exactly as supplied: Apple's grid puts the
  // rounded body at 824/1024 with a 100 px margin for the system shadow.
  'desktop-icon.svg': svg(1024, `<g transform="translate(100 100)">${square(824, 185)}</g>` + mark(500, 512, 512)),
  // Splash: the credit sits inside the central area, which survives both the
  // portrait crop (iOS aspect-fill, Android port-*) and the landscape crop.
  'splash.svg': svg(
    2732,
    square(2732) +
      mark(640, 1366, 1366) +
      line(CREDIT_NAME, 58, 1366, 2732 * 0.715, CREDIT) +
      line(CREDIT_ID, 46, 1366, 2732 * 0.715 + 84, MUTED, 9),
  ),
};

const outDir = new URL('../svg/', import.meta.url);
await mkdir(outDir, { recursive: true });
for (const [name, content] of Object.entries(masters)) {
  await writeFile(new URL(name, outDir), content);
  console.log(`WRITE brand/svg/${name}`);
}
