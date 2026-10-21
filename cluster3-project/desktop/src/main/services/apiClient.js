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
 * @typedef {Object} ApiEnvelope
 * @property {boolean} ok - True when an HTTP response arrived. NOT "all is
 *   well": a 503 from /health is a successful exchange reporting a database
 *   outage, and the screen must be able to tell those apart.
 * @property {number|null} status - HTTP status code, or null when no response
 *   arrived at all.
 * @property {object|null} data - The `data` field of the API's body, when there
 *   was one.
 * @property {string|null} error - Human-readable description of the failure;
 *   for a non-2xx reply, the API's own `message`.
 * @property {object|null} pagination - The body's `pagination`, for lists.
 * @property {Array<{field?: string, message: string}>} errors - Per-field
 *   messages the API sent with a 400 or 409; empty otherwise.
 */

/**
 * @typedef {Object} RequestOptions
 * @property {object} [body] - JSON body, for writes.
 * @property {string|null} [token] - Bearer token for authenticated routes.
 * @property {Object<string, string|number|undefined>} [query] - Query string
 *   values; undefined ones are left out.
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
 * @returns {{getHealth: () => Promise<ApiEnvelope>,
 *   login: (credentials: {email: string, password: string}) => Promise<ApiEnvelope>,
 *   request: (method: string, path: string, options?: RequestOptions) => Promise<ApiEnvelope>}}
 *   The API client.
 */
function createApiClient({ fetchImpl, baseUrl, timeoutMs }) {
  /**
   * Perform one request and describe its outcome as an envelope.
   *
   * Resolves for every outcome and rejects for none, by design.
   *
   * @param {string} method - HTTP method.
   * @param {string} path - Path under the base URL, starting with a slash.
   * @param {RequestOptions} [options] - Body, token and query string.
   * @returns {Promise<ApiEnvelope>} The result envelope.
   */
  async function send(method, path, { body, token, query } = {}) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) search.set(key, String(value));
    }
    const url = `${baseUrl}${path}${search.size > 0 ? `?${search}` : ''}`;

    const headers = {};
    const init = { method, headers, signal: AbortSignal.timeout(timeoutMs) };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetchImpl(url, init);
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
        pagination: null,
        errors: [],
      };
    }

    try {
      const payload = await response.json();
      // The API wraps every payload as { message, data, pagination }; the IPC
      // envelope carries only `data`, so the renderer never sees the wrapper.
      if (payload === null || typeof payload !== 'object' || !('data' in payload)) {
        return {
          ok: true,
          status: response.status,
          data: null,
          error: 'The API responded in an unexpected format.',
          pagination: null,
          errors: [],
        };
      }
      const failed = response.status < 200 || response.status >= 300;
      return {
        ok: true,
        status: response.status,
        data: payload.data,
        error: failed ? String(payload.message ?? `The API answered ${response.status}.`) : null,
        pagination: payload.pagination ?? null,
        errors: Array.isArray(payload.errors) ? payload.errors : [],
      };
    } catch {
      // The server answered, so ok stays true — the payload is what is wrong.
      return {
        ok: true,
        status: response.status,
        data: null,
        error: 'The API responded with a body that is not valid JSON.',
        pagination: null,
        errors: [],
      };
    }
  }

  /**
   * Ask the API whether it and its database are healthy.
   *
   * @returns {Promise<ApiEnvelope>} The result envelope; never rejects.
   */
  function getHealth() {
    return send('GET', '/health');
  }

  /**
   * Exchange credentials for an access token.
   *
   * @param {{email: string, password: string}} credentials - What the admin typed.
   * @returns {Promise<ApiEnvelope>} On success, `data` is `{ token, user }`;
   *   never rejects.
   */
  function login({ email, password }) {
    return send('POST', '/auth/login', { body: { email, password } });
  }

  return { getHealth, login, request: send };
}

module.exports = { createApiClient };
