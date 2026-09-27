/**
 * @file API response envelope.
 *
 * Every /api/v1 response — success, failure and 404 alike — shares one shape:
 * `{ message, data, pagination }`. Building it here, and nowhere else, is what
 * lets web, mobile and desktop read any endpoint with one parser.
 */

/**
 * Send one record (or any non-list payload).
 *
 * @param {import('express').Response} res - Outgoing response.
 * @param {unknown} data - Payload placed under `data`.
 * @param {string} [message] - Human-readable summary.
 * @param {number} [status] - HTTP status.
 * @returns {void}
 */
export function sendOk(res, data, message = 'OK', status = 200) {
  res.status(status).json({ message, data, pagination: null });
}

/**
 * Send a newly created record with 201.
 *
 * @param {import('express').Response} res - Outgoing response.
 * @param {unknown} data - The created record.
 * @param {string} [message] - Human-readable summary.
 * @returns {void}
 */
export function sendCreated(res, data, message = 'Created') {
  sendOk(res, data, message, 201);
}

/**
 * Send one page of a list.
 *
 * @param {import('express').Response} res - Outgoing response.
 * @param {Array<unknown>} items - Records on this page.
 * @param {import('./pagination.js').Pagination} pagination - The page's metadata.
 * @param {string} [message] - Human-readable summary.
 * @returns {void}
 */
export function sendPage(res, items, pagination, message = 'OK') {
  res.status(200).json({ message, data: items, pagination });
}

/**
 * Build the body of a failed API response.
 *
 * @param {Object} options - Error parts.
 * @param {string} options.message - What went wrong, safe to show a client.
 * @param {Array<{field?: string, message: string}>} [options.errors] - Per-field messages.
 * @param {string} [options.stack] - Stack trace; callers pass it outside production only.
 * @returns {{message: string, data: null, pagination: null, errors: Array<Object>, stack?: string}}
 *   The error envelope.
 */
export function errorBody({ message, errors = [], stack }) {
  const body = { message, data: null, pagination: null, errors };
  if (stack) body.stack = stack;
  return body;
}
