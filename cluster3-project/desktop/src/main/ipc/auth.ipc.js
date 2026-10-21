/**
 * @file IPC handlers for the admin session.
 *
 * Bridges sign-in and sign-out to the main-process session. Like the health
 * handler, neither throws: the session already answers with a result envelope,
 * and an exception would reach the renderer stripped of its status code.
 */

const { ipcMain } = require('electron');

/**
 * Register the `auth:sign-in` and `auth:sign-out` channels.
 *
 * @param {{signIn: Function, signOut: Function}} session - The admin session.
 * @returns {void}
 */
function registerAuthIpc(session) {
  ipcMain.handle('auth:sign-in', (_event, credentials) => session.signIn(credentials));
  ipcMain.handle('auth:sign-out', () => session.signOut());
}

module.exports = { registerAuthIpc };
