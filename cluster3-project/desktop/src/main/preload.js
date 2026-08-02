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

contextBridge.exposeInMainWorld('api', {
  /**
   * Ask the main process for the REST API's health.
   *
   * @returns {Promise<{ok: boolean, status: number|null, data: object|null, error: string|null}>}
   *   The result envelope. Never rejects.
   */
  getHealth: () => ipcRenderer.invoke('api:health'),
});
