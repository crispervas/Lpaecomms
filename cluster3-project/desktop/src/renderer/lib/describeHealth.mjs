/**
 * @file Maps a health-check result envelope to presentation fields.
 *
 * Extracted from ApiStatus.jsx so `node --test` can exercise it directly: a
 * .jsx file is never loaded by the test runner, and this branch-heavy mapping
 * is exactly the part of that screen most likely to break silently if its
 * guards are reordered. The .mjs extension makes it load as ESM under
 * `node --test` regardless of the package's "type": "commonjs".
 */

/**
 * Describe an envelope as something the user can act on.
 *
 * The 503 branch is the reason this function exists. A 503 from /health means
 * the API answered and is reporting that its database is down — a different
 * problem, with a different fix, from the API being unreachable. Collapsing
 * both into "connection error" would hide exactly what this screen is for.
 *
 * Tailwind class names are written out in full on every branch: the scanner
 * cannot see a class assembled from a variable, and those styles would be
 * stripped from the production build without any error.
 *
 * @param {{ok: boolean, status: number|null, data: object|null, error: string|null}} envelope
 *   Result envelope from the main process.
 * @returns {{tone: string, title: string, detail: string}} Presentation fields.
 */
export function describeHealth(envelope) {
  if (!envelope.ok) {
    return {
      tone: 'border-red-300 bg-red-50 text-red-900',
      title: 'API unreachable',
      detail: envelope.error,
    };
  }

  if (envelope.status === 200 && envelope.data?.db === 'connected') {
    return {
      tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      title: 'API healthy',
      detail: 'The API responded and its database is connected.',
    };
  }

  if (envelope.status === 503) {
    return {
      tone: 'border-amber-300 bg-amber-50 text-amber-900',
      title: 'Database unreachable',
      detail: 'The API is running but cannot reach its database.',
    };
  }

  return {
    tone: 'border-slate-300 bg-slate-100 text-slate-900',
    title: `Unexpected response (${envelope.status})`,
    detail: envelope.error ?? 'The API responded in a way this client does not recognise.',
  };
}
