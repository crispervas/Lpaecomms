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

test('every palette value reaches its correct destination', async () => {
  // A value-equality check here would freeze the palette, and a later task in
  // this plan deliberately changes `muted` and `danger-border` as WCAG fixes —
  // that check would fail by design and train the next implementer to edit the
  // test until it passes. Completeness is the real risk: a token dropped or
  // mistyped on its way through _tokens.less, or through a theme's own block,
  // is invisible in review, so every `@<name>-value` declared in
  // _palette.less is checked for arriving somewhere, whatever value it
  // carries.
  //
  // Two kinds of token live in that one file. A base token — `@ink-value`,
  // `@accent-value` — is what every theme inherits unless it says otherwise,
  // and is checked the way it always has been: it must reach both its
  // `--<name>` custom property on :root and its `@<name>: var(--<name>)` LESS
  // variable in _tokens.less. A theme override — `@midnight-canvas-value`,
  // `@forest-accent-value`, `@contrast-ink-value` — belongs to one theme only.
  // Its name is `<theme>-<rest>`, where `<theme>` is one of the
  // `html[data-theme="..."]` blocks declared in _themes.less, and it is
  // checked for reaching `--<rest>` inside that theme's own block instead: it
  // never touches :root or _tokens.less, and holding it to the base-token
  // check would report a correct implementation as broken. Theme names are
  // read from _themes.less rather than hardcoded, so a theme added later
  // extends this test instead of breaking it.
  const paletteSource = await fs.readFile(
    path.join(LESS_DIR, 'abstracts', '_palette.less'),
    'utf8',
  );
  const tokensSource = await fs.readFile(path.join(LESS_DIR, 'abstracts', '_tokens.less'), 'utf8');
  // _themes.less does not exist until the theme blocks are added; before that,
  // there are no theme names to match against and every palette value is a
  // base token, which is the correct behaviour for a codebase with no themes.
  const themesSource = await fs
    .readFile(path.join(LESS_DIR, 'abstracts', '_themes.less'), 'utf8')
    .catch(() => '');
  const css = await compileStylesheet();
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';

  const themeNames = [...themesSource.matchAll(/html\[data-theme="([\w-]+)"\]/g)].map(
    (match) => match[1],
  );

  const names = [...paletteSource.matchAll(/^@([\w-]+)-value:/gm)].map((match) => match[1]);

  const baseNames = [];
  const overrides = [];

  for (const name of names) {
    const theme = themeNames.find((candidate) => name.startsWith(`${candidate}-`));

    if (theme) {
      overrides.push({ name, theme, rest: name.slice(theme.length + 1) });
    } else {
      baseNames.push(name);
    }
  }

  const missingFromRoot = baseNames.filter((name) => !new RegExp(`--${name}:`).test(root));
  const missingFromTokens = baseNames.filter(
    (name) => !new RegExp(`@${name}:\\s*var\\(--${name}\\)`).test(tokensSource),
  );
  const missingFromTheme = overrides
    .filter(({ theme, rest }) => {
      const block =
        themesSource.match(new RegExp(`html\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`))?.[1] ??
        '';

      return !new RegExp(`--${rest}:`).test(block);
    })
    .map(({ name }) => name);

  assert.deepEqual(
    missingFromRoot,
    [],
    `base tokens missing from :root: ${missingFromRoot.join(', ')}`,
  );
  assert.deepEqual(
    missingFromTokens,
    [],
    `base tokens missing their LESS variable in _tokens.less: ${missingFromTokens.join(', ')}`,
  );
  assert.deepEqual(
    missingFromTheme,
    [],
    `theme overrides missing from their html[data-theme] block: ${missingFromTheme.join(', ')}`,
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
