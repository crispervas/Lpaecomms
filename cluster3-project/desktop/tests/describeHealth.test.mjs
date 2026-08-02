/**
 * @file Tests for the health-status-to-presentation mapping.
 *
 * describeHealth() is pure and branch-heavy: these cover all five outcomes so
 * reordering a guard mislabels a state loudly, in a test, rather than quietly
 * in the running app. Named .mjs, not .test.js, because the package is
 * "type": "commonjs" and this file uses `import`; under commonjs, node --test
 * would parse a `.test.js` file as CJS and the import syntax would fail.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { describeHealth } from '../src/renderer/lib/describeHealth.mjs';

test('an unreachable API reports the envelope error as the detail', () => {
  const result = describeHealth({
    ok: false,
    status: null,
    data: null,
    error: 'The desktop bridge is unavailable.',
  });

  assert.equal(result.title, 'API unreachable');
  assert.equal(result.tone, 'border-red-300 bg-red-50 text-red-900');
  assert.equal(result.detail, 'The desktop bridge is unavailable.');
});

test('a 200 with a connected database reports healthy', () => {
  const result = describeHealth({
    ok: true,
    status: 200,
    data: { status: 'ok', db: 'connected' },
    error: null,
  });

  assert.equal(result.title, 'API healthy');
  assert.equal(result.tone, 'border-emerald-300 bg-emerald-50 text-emerald-900');
});

test('a 503 reports the database as unreachable, not the API', () => {
  const result = describeHealth({
    ok: true,
    status: 503,
    data: { status: 'degraded', db: 'unreachable' },
    error: null,
  });

  assert.equal(result.title, 'Database unreachable');
  assert.equal(result.tone, 'border-amber-300 bg-amber-50 text-amber-900');
});

test('a 200 with an unreachable database falls through to the fallback, not healthy', () => {
  const result = describeHealth({
    ok: true,
    status: 200,
    data: { status: 'ok', db: 'unreachable' },
    error: null,
  });

  assert.equal(result.title, 'Unexpected response (200)');
  assert.equal(result.tone, 'border-slate-300 bg-slate-100 text-slate-900');
});

test('an unrecognised status falls through to the fallback and names the status', () => {
  const result = describeHealth({
    ok: true,
    status: 418,
    data: null,
    error: null,
  });

  assert.equal(result.title, 'Unexpected response (418)');
  assert.equal(result.tone, 'border-slate-300 bg-slate-100 text-slate-900');
});
