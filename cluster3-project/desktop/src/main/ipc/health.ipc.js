/**
 * @file IPC handler for API health checks.
 *
 * Bridges the renderer's request to the API client. The handler never throws:
 * an exception escaping ipcMain.handle reaches the renderer wrapped as
 * "Error invoking remote method 'api:health': ...", losing the status code on
 * the way. The client's envelope already describes every outcome, so this
 * handler only has to pass it through.
 */

const { ipcMain } = require('electron');

/**
 * Register the `api:health` channel.
 *
 * @param {{getHealth: () => Promise<object>}} apiClient - Client performing the request.
 * @returns {void}
 */
function registerHealthIpc(apiClient) {
  ipcMain.handle('api:health', () => apiClient.getHealth());
}

module.exports = { registerHealthIpc };
