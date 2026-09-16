/**
 * @file Text scaling contract.
 *
 * The text size control works by moving the root font size, which only reaches
 * a rule that sized itself in rem. A single px font-size is a line of the page
 * that silently refuses to grow, and it is invisible in review — so the absence
 * of them is asserted rather than remembered.
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
 * Every `.less` file under a directory, recursively.
 *
 * @param {string} directory - Directory to walk.
 * @returns {Promise<Array<string>>} Absolute file paths.
 */
async function lessFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) return lessFiles(full);
      return entry.name.endsWith('.less') ? [full] : [];
    }),
  );

  return nested.flat();
}

test('no rule sizes its text in pixels', async () => {
  const files = await lessFiles(LESS_DIR);
  const offenders = [];

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');

    source.split('\n').forEach((line, index) => {
      if (/font-size:\s*[\d.]+px/.test(line)) {
        offenders.push(`${path.relative(LESS_DIR, file)}:${index + 1}`);
      }
    });
  }

  assert.deepEqual(offenders, [], `px font sizes will not scale: ${offenders.join(', ')}`);
});

test('the three text size steps compile', async () => {
  const entry = path.join(LESS_DIR, 'main.less');
  const source = await fs.readFile(entry, 'utf8');
  const { css } = await less.render(source, { filename: entry, paths: [LESS_DIR] });

  assert.match(css, /html\s*\{[^}]*font-size:\s*100%/);
  assert.match(css, /html\[data-text-size="large"\]\s*\{\s*font-size:\s*112\.5%/);
  assert.match(css, /html\[data-text-size="larger"\]\s*\{\s*font-size:\s*125%/);
});
