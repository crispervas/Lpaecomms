# Lpaecomms Desktop

Electron admin client for the Lpaecomms store. It consumes the REST API served
by `cluster3-project/web` and shares no UI code with the web or mobile
platforms — the API is the only contract between them.

## Requirements

- Node.js >= 20
- pnpm 10.33.0
- The web platform running, for the API (`cluster3-project/web`)

## Setup

```bash
pnpm install
cp .env.example .env
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server plus Electron, in one process group |
| `pnpm dev:renderer` | Vite dev server alone, on port 5173 |
| `pnpm build` | Compile the renderer into `dist/` |
| `pnpm start` | Run Electron against the compiled renderer in `dist/` (run `pnpm build` first) |
| `pnpm test` | Run the whole test suite |
| `node --test tests/env.test.js` | Run a single test file |

`pnpm start` sets `USE_BUILT_RENDERER=true` inline, which is POSIX shell syntax.
On Windows, set the variable separately before running `electron .`.

## Environment variables

See `.env.example` for the full list. Two of them are easy to confuse:

- `NODE_ENV` decides **which API** the app talks to.
- `app.isPackaged || USE_BUILT_RENDERER` decides **how the renderer is
  served** — Vite's dev server or the compiled `index.html`.

They are independent, so a development build can point at staging.

## Architecture

Three processes with one boundary:

- `src/main/` performs all configuration reading and HTTP. Nothing else does.
- `src/main/preload.js` exposes named functions on `window.api` through
  `contextBridge`. There is no generic IPC passthrough.
- `src/renderer/` is React with no Node access and no network access.

The window runs with `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, and a Content Security Policy that forbids outbound
connections whenever the compiled renderer is served.
