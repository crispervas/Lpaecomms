/**
 * @file The admin operations the renderer may ask the main process for.
 *
 * Each operation is one named function over one REST route, sent with the
 * session's token. The renderer reaches them through the preload, one named
 * function per operation, so it never holds the token and can call nothing
 * that is not listed in ADMIN_OPERATIONS.
 *
 * Arguments cross the IPC boundary from a page that could be compromised, so
 * ids and bodies are checked here before anything is sent. A 401 means the
 * token has expired or been revoked: the session ends at once, and the
 * renderer is told in words it can show on the sign-in screen.
 */

/** Shown when a call finds no valid session. */
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

/** Largest page the API serves; lists are fetched in pages of this size. */
const PAGE_SIZE = 100;

/**
 * Every operation, by the name the preload exposes it under.
 *
 * @type {ReadonlyArray<string>}
 */
const ADMIN_OPERATIONS = Object.freeze([
  'listCategories', 'createCategory', 'updateCategory', 'deleteCategory',
  'listProducts', 'createProduct', 'updateProduct', 'deleteProduct',
  'listUsers', 'createUser', 'updateUser', 'deleteUser', 'blockUser', 'unblockUser',
  'listOrders', 'updateOrder', 'deleteOrder',
  'getStats', 'listRoles', 'listGenders', 'listDocumentTypes',
]);

/**
 * Build a failure envelope that no request produced.
 *
 * @param {number|null} status - Status to report.
 * @param {string} error - Message for the renderer.
 * @returns {object} The envelope.
 */
function refusal(status, error) {
  return { ok: false, status, data: null, error, pagination: null, errors: [] };
}

/**
 * Whether a value from the renderer is a usable database id.
 *
 * @param {unknown} id - Candidate id.
 * @returns {boolean} True for a positive integer within PostgreSQL's int4.
 */
function isId(id) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}

/**
 * Whether a value from the renderer is a plain JSON object body.
 *
 * @param {unknown} body - Candidate body.
 * @returns {boolean} True for a non-null, non-array object.
 */
function isBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

/**
 * Create the admin API over a client and the admin session.
 *
 * @param {Object} options - Dependencies.
 * @param {{request: Function}} options.apiClient - Client performing requests.
 * @param {{token: Function, signOut: Function}} options.session - The admin session.
 * @returns {Object<string, Function>} One function per ADMIN_OPERATIONS name;
 *   each resolves to a result envelope and never rejects.
 */
function createAdminApi({ apiClient, session }) {
  /**
   * Send one authenticated request.
   *
   * @param {string} method - HTTP method.
   * @param {string} path - Path under /api/v1.
   * @param {{body?: object, query?: object}} [options] - Body and query.
   * @returns {Promise<object>} The result envelope.
   */
  async function call(method, path, { body, query } = {}) {
    const token = session.token();
    if (!token) return refusal(401, SESSION_EXPIRED);

    const envelope = await apiClient.request(method, path, { token, body, query });
    if (envelope.status === 401) {
      session.signOut();
      return { ...envelope, error: SESSION_EXPIRED };
    }
    return envelope;
  }

  /**
   * Fetch every page of a list and join them.
   *
   * The admin screens sort, search and page in memory, so they need the whole
   * list; a store this size fits in a few pages.
   *
   * @param {string} path - List path.
   * @returns {Promise<object>} The envelope with every row in `data`, or the
   *   first failing page's envelope.
   */
  async function listAll(path) {
    const rows = [];
    for (let page = 1; ; page += 1) {
      const envelope = await call('GET', path, { query: { page, limit: PAGE_SIZE } });
      if (!envelope.ok || envelope.status !== 200) return envelope;
      rows.push(...(envelope.data ?? []));
      if (!envelope.pagination?.hasNextPage) {
        return { ...envelope, data: rows, pagination: null };
      }
    }
  }

  /**
   * Build the create/update/delete trio for one resource.
   *
   * @param {string} path - Collection path, e.g. "/products".
   * @returns {{create: Function, update: Function, remove: Function}} The writes.
   */
  function writes(path) {
    return {
      create: async (body) => (isBody(body) ? call('POST', path, { body }) : refusal(null, 'Invalid request.')),
      update: async (id, body) =>
        isId(id) && isBody(body) ? call('PUT', `${path}/${id}`, { body }) : refusal(null, 'Invalid request.'),
      remove: async (id) => (isId(id) ? call('DELETE', `${path}/${id}`) : refusal(null, 'Invalid request.')),
    };
  }

  /**
   * Build a body-less POST action on one user.
   *
   * @param {'block'|'unblock'} action - The action segment.
   * @returns {(id: number) => Promise<object>} The operation.
   */
  function userAction(action) {
    return async (id) => (isId(id) ? call('POST', `/users/${id}/${action}`) : refusal(null, 'Invalid request.'));
  }

  const categories = writes('/categories');
  const products = writes('/products');
  const users = writes('/users');
  const orders = writes('/purchases');

  return {
    listCategories: () => listAll('/categories'),
    createCategory: categories.create,
    updateCategory: categories.update,
    deleteCategory: categories.remove,
    listProducts: () => listAll('/products'),
    createProduct: products.create,
    updateProduct: products.update,
    deleteProduct: products.remove,
    listUsers: () => listAll('/users'),
    createUser: users.create,
    updateUser: users.update,
    deleteUser: users.remove,
    blockUser: userAction('block'),
    unblockUser: userAction('unblock'),
    listOrders: () => listAll('/purchases'),
    updateOrder: orders.update,
    deleteOrder: orders.remove,
    getStats: () => call('GET', '/stats'),
    listRoles: () => listAll('/roles'),
    listGenders: () => listAll('/genders'),
    listDocumentTypes: () => listAll('/document-types'),
  };
}

module.exports = { createAdminApi, ADMIN_OPERATIONS, SESSION_EXPIRED };
