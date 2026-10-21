/**
 * @file IPC handlers for the admin operations.
 *
 * One channel per operation, `admin:<name>`, each passing its arguments to the
 * admin API. Like the other handlers, none throws: the admin API answers every
 * outcome with a result envelope.
 */

const { ipcMain } = require('electron');

const { ADMIN_OPERATIONS } = require('../services/adminApi.js');

/**
 * Register an `admin:<name>` channel for every admin operation.
 *
 * @param {Object<string, Function>} adminApi - Operations from createAdminApi.
 * @returns {void}
 */
function registerAdminIpc(adminApi) {
  for (const name of ADMIN_OPERATIONS) {
    ipcMain.handle(`admin:${name}`, (_event, ...args) => adminApi[name](...args));
  }
}

module.exports = { registerAdminIpc };
