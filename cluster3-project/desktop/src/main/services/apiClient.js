/**
 * @file REST API client for the main process.
 *
 * The only part of the desktop application that performs network requests. It
 * translates every outcome — success, server error, unreachable host, timeout —
 * into the same result envelope, so callers branch on data rather than on
 * exceptions. That matters because these results cross an IPC boundary, where a
 * thrown error would arrive re-wrapped and stripped of its status code.
 */

/**
 * Result of an API call.
 *
 * @typedef {Object} HealthEnvelope
 * @property {boolean} ok - True when an HTTP response arrived. NOT "all is
 *   well": a 503 from /health is a successful exchange reporting a database
 *   outage, and the screen must be able to tell those apart.
 * @property {number|null} status - HTTP status code, or null when no response
 *   arrived at all.
 * @property {object|null} data - Parsed JSON body, when there was one.
 * @property {string|null} error - Human-readable description of the failure.
 */

/**
 * Create a client bound to a base URL and a timeout.
 *
 * fetch is injected rather than referenced globally so the failure modes can be
 * exercised in tests without a running server.
 *
 * @param {Object} options - Client options.
 * @param {Function} options.fetchImpl - fetch-compatible implementation.
 * @param {string} options.baseUrl - API base URL including the /api/v1 prefix.
 * @param {number} options.timeoutMs - Per-request timeout in milliseconds.
 * @returns {{getHealth: () => Promise<HealthEnvelope>}} The API client.
 */
function createApiClient({ fetchImpl, baseUrl, timeoutMs }) {
  /**
   * Ask the API whether it and its database are healthy.
   *
   * Resolves for every outcome and rejects for none, by design.
   *
   * @returns {Promise<HealthEnvelope>} The result envelope.
   */
  async function getHealth() {
    const url = `${baseUrl}/health`;

    let response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      // AbortSignal.timeout raises TimeoutError; an aborted request raises
      // AbortError. Everything else here means the host was never reached.
      const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
      return {
        ok: false,
        status: null,
        data: null,
        error: timedOut
          ? `The API did not respond within ${timeoutMs} ms.`
          : `Cannot reach the API at ${url}.`,
      };
    }

    try {
      const data = await response.json();
      return { ok: true, status: response.status, data, error: null };
    } catch {
      // The server answered, so ok stays true — the payload is what is wrong.
      return {
        ok: true,
        status: response.status,
        data: null,
        error: 'The API responded with a body that is not valid JSON.',
      };
    }
  }

  return { getHealth };
}

module.exports = { createApiClient };
