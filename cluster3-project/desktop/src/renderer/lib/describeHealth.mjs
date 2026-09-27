/**
 * @file Maps a health-check result envelope to presentation fields.
 *
 * Feeds the REST API row of Settings → System status. Kept apart from the
 * screen so `node --test` can exercise it directly: a .jsx file is never
 * loaded by the test runner, and this branch-heavy mapping is exactly the part
 * most likely to break silently if its guards are reordered. The .mjs extension makes it load as ESM under
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
 * The result names a service state rather than colours, so the screen decides
 * how each state looks and every status row on it shares one vocabulary.
 *
 * @param {{ok: boolean, status: number|null, data: object|null, error: string|null}} envelope
 *   Result envelope from the main process.
 * @returns {{state: 'operational'|'degraded'|'down'|'unknown', title: string,
 *   detail: string}} Presentation fields.
 */
export function describeHealth(envelope) {
  if (!envelope.ok) {
    return {
      state: 'down',
      title: 'API unreachable',
      detail: envelope.error,
    };
  }

  if (envelope.status === 200 && envelope.data?.db === 'connected') {
    return {
      state: 'operational',
      title: 'API healthy',
      detail: 'The API responded and its database is connected.',
    };
  }

  if (envelope.status === 503) {
    return {
      state: 'degraded',
      title: 'Database unreachable',
      detail: 'The API is running but cannot reach its database.',
    };
  }

  return {
    state: 'unknown',
    title: `Unexpected response (${envelope.status})`,
    detail: envelope.error ?? 'The API responded in a way this client does not recognise.',
  };
}
