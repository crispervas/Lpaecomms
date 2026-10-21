/**
 * @file Preload bridge between the renderer and the main process.
 *
 * Exposes named functions only. A generic invoke(channel, ...args) passthrough
 * would hand the renderer the entire IPC surface at once, including channels
 * added later; with named functions, what is not written here cannot be called.
 *
 * This runs in a sandboxed context with contextIsolation enabled, so the object
 * below is the renderer's complete view of the outside world.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Admin operations, each exposed as `window.api.<name>` over `admin:<name>`.
 *
 * Written out rather than imported: a sandboxed preload cannot require local
 * files. tests/adminApi.test.js checks this list against ADMIN_OPERATIONS in
 * services/adminApi.js, so the two cannot drift. Every function resolves to
 * `{ok, status, data, error, pagination, errors}` and never rejects.
 */
const ADMIN_OPERATIONS = [
  'listCategories', 'createCategory', 'updateCategory', 'deleteCategory',
  'listProducts', 'createProduct', 'updateProduct', 'deleteProduct',
  'listUsers', 'createUser', 'updateUser', 'deleteUser', 'blockUser', 'unblockUser',
  'listOrders', 'updateOrder', 'deleteOrder',
  'getStats', 'listRoles', 'listGenders', 'listDocumentTypes',
];

/** One named function per admin operation; nothing outside the list is reachable. */
const adminFunctions = Object.fromEntries(
  ADMIN_OPERATIONS.map((name) => [name, (...args) => ipcRenderer.invoke(`admin:${name}`, ...args)]),
);

contextBridge.exposeInMainWorld('api', {
  /**
   * Ask the main process for the REST API's health.
   *
   * @returns {Promise<{ok: boolean, status: number|null, data: object|null, error: string|null}>}
   *   The result envelope. Never rejects.
   */
  getHealth: () => ipcRenderer.invoke('api:health'),

  /**
   * Sign an administrator in. The token stays in the main process; only the
   * account's public fields come back.
   *
   * @param {{email: string, password: string}} credentials - What the admin typed.
   * @returns {Promise<{ok: boolean, status: number|null, data: {user: object}|null, error: string|null}>}
   *   The result envelope. Never rejects.
   */
  signIn: (credentials) => ipcRenderer.invoke('auth:sign-in', credentials),

  /**
   * End the session and forget its token.
   *
   * @returns {Promise<void>}
   */
  signOut: () => ipcRenderer.invoke('auth:sign-out'),

  ...adminFunctions,
});
