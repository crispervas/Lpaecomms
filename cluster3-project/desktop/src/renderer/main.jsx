/**
 * @file Renderer entry point.
 *
 * Mounts React into the document. This file runs inside a sandboxed renderer
 * with no Node and no network access; everything it needs arrives through
 * window.api, which the preload script defines.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles/tailwind.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
