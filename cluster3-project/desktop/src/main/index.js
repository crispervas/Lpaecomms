/**
 * @file Electron main process entry point.
 *
 * Owns the application lifecycle, the browser window, and the security policy
 * applied to it. This is the only process with configuration and network
 * access; the renderer reaches the API exclusively through the preload bridge.
 */

const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');

const { config } = require('./config/env.js');
const { createApiClient } = require('./services/apiClient.js');
const { registerHealthIpc } = require('./ipc/health.ipc.js');

/**
 * Whether the window loads the compiled renderer rather than the dev server.
 *
 * `app.isPackaged` is the real signal, but it is true only in a packaged build.
 * Until packaging exists, USE_BUILT_RENDERER is the only way to reach the
 * compiled path at all. Both the load target and the CSP derive from this one
 * predicate so they can never disagree — a file:// page served under the dev
 * CSP would be a silent inconsistency.
 *
 * This says nothing about which API is targeted; that stays with NODE_ENV.
 *
 * @returns {boolean} True when the compiled renderer is served.
 */
function servesBuiltRenderer() {
  return app.isPackaged || config.useBuiltRenderer;
}

/**
 * Content Security Policy for the renderer.
 *
 * The renderer performs no network requests of its own — everything goes over
 * IPC — so a packaged build can forbid connections outright. Development needs
 * the Vite dev server for module loading and its websocket for hot reload, and
 * Vite injects styles inline while developing.
 *
 * @returns {string} The CSP header value for the current mode.
 */
function contentSecurityPolicy() {
  if (servesBuiltRenderer()) {
    return "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'";
  }
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${config.devServerUrl} ws://localhost:5173`,
  ].join('; ');
}

/**
 * Apply the CSP to every response the renderer receives.
 *
 * @returns {void}
 */
function applySecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [contentSecurityPolicy()],
      },
    });
  });
}

/**
 * Create the application window and load the renderer.
 *
 * Which renderer is loaded follows from `servesBuiltRenderer()`, not from
 * NODE_ENV: the two are independent axes. NODE_ENV decides which API the app
 * targets, so a development build can legitimately point at staging.
 *
 * @returns {BrowserWindow} The created window.
 */
function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Show only once the first paint is ready, to avoid a white flash.
  window.once('ready-to-show', () => window.show());

  if (servesBuiltRenderer()) {
    window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  } else {
    window.loadURL(config.devServerUrl);
  }

  return window;
}

app.whenReady().then(() => {
  applySecurityPolicy();

  registerHealthIpc(
    createApiClient({
      fetchImpl: fetch,
      baseUrl: config.apiBaseUrl,
      timeoutMs: config.apiTimeoutMs,
    }),
  );

  createWindow();

  // macOS keeps the application running with no windows; recreate on dock click.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS convention is to stay resident until the user quits explicitly.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
