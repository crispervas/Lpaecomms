/**
 * @file Tests for the main-process admin API.
 *
 * The API client is stubbed with a recorder, so these pin down what the layer
 * adds: the session's token on every call, every page of a list, a 401 that
 * ends the session, and arguments checked before anything leaves the process.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createAdminApi, ADMIN_OPERATIONS, SESSION_EXPIRED } = require('../src/main/services/adminApi.js');

/**
 * Build an admin API over a recording client and a session holding `token`.
 *
 * @param {Array<object>} replies - Envelopes the client answers, in order.
 * @param {string|null} [token] - The session's token.
 * @returns {{api: object, calls: Array<object>, session: object}} The parts.
 */
function setup(replies, token = 'jwt') {
  const calls = [];
  const session = {
    current: token,
    token() { return this.current; },
    signOut() { this.current = null; },
  };
  const apiClient = {
    async request(method, apiPath, options) {
      calls.push({ method, path: apiPath, ...options });
      return replies.shift();
    },
  };
  return { api: createAdminApi({ apiClient, session }), calls, session };
}

const ok = (data, pagination = null) => ({ ok: true, status: 200, data, error: null, pagination, errors: [] });
const page = (n, more) => ({ total: 3, page: n, limit: 100, totalPages: 2, count: 1, hasNextPage: more, hasPrevPage: n > 1 });

test('every operation is exposed by name in the preload', () => {
  const preload = fs.readFileSync(path.join(__dirname, '../src/main/preload.js'), 'utf8');
  for (const name of ADMIN_OPERATIONS) assert.match(preload, new RegExp(`'${name}'`), name);
  assert.deepEqual(Object.keys(createAdminApi({ apiClient: {}, session: {} })).sort(), [...ADMIN_OPERATIONS].sort());
});

test('sends the session token with the request', async () => {
  const { api, calls } = setup([ok({ users: {} })]);
  await api.getStats();
  assert.deepEqual(calls, [{ method: 'GET', path: '/stats', token: 'jwt', body: undefined, query: undefined }]);
});

test('a list follows every page and joins them', async () => {
  const { api, calls } = setup([ok([{ id: 1 }], page(1, true)), ok([{ id: 2 }], page(2, false))]);
  const result = await api.listProducts();
  assert.deepEqual(result.data, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(calls.map((c) => c.query), [{ page: 1, limit: 100 }, { page: 2, limit: 100 }]);
  assert.equal(result.pagination, null);
});

test('a failing page answers its own envelope', async () => {
  const failed = { ok: true, status: 500, data: null, error: 'Boom', pagination: null, errors: [] };
  const { api } = setup([ok([{ id: 1 }], page(1, true)), failed]);
  assert.deepEqual(await api.listUsers(), failed);
});

test('writes go to the right method and path', async () => {
  const { api, calls } = setup(Array.from({ length: 6 }, () => ok({})));
  await api.createCategory({ name: 'A' });
  await api.updateProduct(4, { price: 2 });
  await api.deleteUser(9);
  await api.blockUser(9);
  await api.unblockUser(9);
  await api.updateOrder(3, { fulfillmentStatus: 'SHIPPED' });
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), [
    'POST /categories', 'PUT /products/4', 'DELETE /users/9',
    'POST /users/9/block', 'POST /users/9/unblock', 'PUT /purchases/3',
  ]);
  assert.deepEqual(calls[1].body, { price: 2 });
});

test('a 401 ends the session and says so', async () => {
  const { api, session } = setup([{ ok: true, status: 401, data: null, error: 'Sign in to continue.', pagination: null, errors: [] }]);
  const result = await api.deleteProduct(1);
  assert.equal(result.status, 401);
  assert.equal(result.error, SESSION_EXPIRED);
  assert.equal(session.token(), null);
});

test('without a token nothing is sent', async () => {
  const { api, calls } = setup([], null);
  const result = await api.listOrders();
  assert.deepEqual(result, { ok: false, status: 401, data: null, error: SESSION_EXPIRED, pagination: null, errors: [] });
  assert.equal(calls.length, 0);
});

test('a bad id or body is refused before any request', async () => {
  const { api, calls } = setup([]);
  for (const result of [
    await api.updateProduct('abc', {}),
    await api.deleteCategory(0),
    await api.blockUser(1.5),
    await api.createUser(null),
    await api.updateOrder(2, ['x']),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Invalid request.');
  }
  assert.equal(calls.length, 0);
});

test('lookups for the user form list every page', async () => {
  const { api, calls } = setup([ok([], page(1, false)), ok([], page(1, false)), ok([], page(1, false))]);
  await api.listRoles();
  await api.listGenders();
  await api.listDocumentTypes();
  assert.deepEqual(calls.map((c) => c.path), ['/roles', '/genders', '/document-types']);
});
