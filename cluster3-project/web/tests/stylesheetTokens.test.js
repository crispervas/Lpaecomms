/**
 * @file Stylesheet token contract.
 *
 * The themes work by redeclaring CSS custom properties, which only holds while
 * every colour in the compiled stylesheet reads from one. A rule that writes a
 * literal instead is invisible in review and simply refuses to change theme, so
 * the rule is enforced here rather than trusted.
 *
 * Compiles the LESS source directly rather than reading src/public/css/main.css,
 * so the suite does not depend on `pnpm build:css` having been run.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import less from 'less';

/** Absolute path to the LESS source directory. */
const LESS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'less');

/**
 * Compile the stylesheet entry point.
 *
 * @returns {Promise<string>} The compiled CSS.
 */
async function compileStylesheet() {
  const entry = path.join(LESS_DIR, 'main.less');
  const source = await fs.readFile(entry, 'utf8');
  const output = await less.render(source, { filename: entry, paths: [LESS_DIR] });

  return output.css;
}

test('the compiled stylesheet publishes the colour tokens on :root', async () => {
  const css = await compileStylesheet();
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(root, /--canvas:\s*#FAFAF8/i);
  assert.match(root, /--surface:\s*#FFFFFF/i);
  assert.match(root, /--ink:\s*#14161A/i);
  assert.match(root, /--accent:\s*#2F5EFB/i);
  assert.match(root, /--accent-strong:\s*#1F45D6/i);
});

test('every palette value reaches :root and its LESS variable', async () => {
  // A value-equality check here would freeze the palette, and a later task in
  // this plan deliberately changes `muted` and `danger-border` as WCAG fixes —
  // that check would fail by design and train the next implementer to edit the
  // test until it passes. Completeness is the real risk: a token dropped or
  // mistyped on its way through _tokens.less is invisible in review, so every
  // `@<name>-value` declared in _palette.less is checked for arriving at both
  // its `--<name>` custom property and its `@<name>: var(--<name>)` LESS
  // variable, whatever value it carries.
  const paletteSource = await fs.readFile(
    path.join(LESS_DIR, 'abstracts', '_palette.less'),
    'utf8',
  );
  const tokensSource = await fs.readFile(path.join(LESS_DIR, 'abstracts', '_tokens.less'), 'utf8');
  const css = await compileStylesheet();
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';

  const names = [...paletteSource.matchAll(/^@([\w-]+)-value:/gm)].map((match) => match[1]);

  const missingFromRoot = names.filter((name) => !new RegExp(`--${name}:`).test(root));
  const missingFromTokens = names.filter(
    (name) => !new RegExp(`@${name}:\\s*var\\(--${name}\\)`).test(tokensSource),
  );

  assert.deepEqual(missingFromRoot, [], `tokens missing from :root: ${missingFromRoot.join(', ')}`);
  assert.deepEqual(
    missingFromTokens,
    [],
    `tokens missing their LESS variable in _tokens.less: ${missingFromTokens.join(', ')}`,
  );
});

test('the component rules read the accent through its custom property', async () => {
  const css = await compileStylesheet();

  assert.match(css, /\.button--solid\s*\{[^}]*background-color:\s*var\(--ink\)/);
});

test('no rule outside :root and the theme blocks hardcodes a colour', async () => {
  const css = await compileStylesheet();

  // :root and html[data-theme=...] are the two places a literal belongs; every
  // other occurrence is a rule that opted out of theming. Comments are stripped
  // first because LESS preserves /* */ blocks in its output, and _tokens.less
  // explains the two-name convention by naming a hex value that never becomes
  // a rule.
  const themeable = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:root\s*\{[^}]*\}/g, '')
    .replace(/html\[data-theme=[^\]]*\]\s*\{[^}]*\}/g, '');

  const leaked = themeable.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];

  assert.deepEqual(leaked, [], `colour literals outside the token blocks: ${leaked.join(', ')}`);
});
