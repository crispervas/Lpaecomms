/**
 * @file Vite configuration for the renderer process.
 *
 * Vite compiles the renderer and nothing else. The main process and the preload
 * script stay CommonJS and need no build step, so there is exactly one build in
 * this package and it is this one.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths. In production Electron loads the built index.html over
  // file://, where an absolute '/assets/...' would resolve against the filesystem
  // root and the window would render blank.
  base: './',
  plugins: [react()],
  server: {
    // Pinned rather than negotiated: `wait-on tcp:5173` and the DEV_SERVER_URL
    // default both hardcode this number. Vite's fallback would move a busy port
    // to 5174 silently, leaving Electron waiting on a port nobody listens to.
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
