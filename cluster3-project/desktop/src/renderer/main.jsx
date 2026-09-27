/**
 * @file Renderer entry point.
 *
 * Mounts React into the document. This file runs inside a sandboxed renderer
 * with no Node and no network access; everything it needs arrives through
 * window.api, which the preload script defines.
 *
 * Fonts are bundled through @fontsource rather than Google Fonts: the renderer's
 * CSP allows only 'self', and an admin console should not need the internet to
 * draw its own typeface.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/space-grotesk/700.css';
import './styles/tailwind.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
