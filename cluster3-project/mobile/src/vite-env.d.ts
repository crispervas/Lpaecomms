/// <reference types="vite/client" />

/**
 * Build-time environment variables this app reads. Vite only exposes
 * variables prefixed VITE_; see `.env.example` for per-environment values.
 */
interface ImportMetaEnv {
  /** Base URL of the Lpaecomms REST API, including the /api/v1 prefix. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
