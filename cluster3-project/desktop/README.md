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
| `pnpm dist:mac` | Build a universal macOS installer (`.dmg`) into `release/` |
| `pnpm dist:win` | Build a Windows installer (`.exe`, NSIS) into `release/` |

`pnpm start` sets `USE_BUILT_RENDERER=true` inline, which is POSIX shell syntax.
On Windows, set the variable separately before running `electron .`.

## Environment variables

See `.env.example` for the full list. Two of them are easy to confuse:

- `NODE_ENV` decides **which API** the app talks to.
- `app.isPackaged || USE_BUILT_RENDERER` decides **how the renderer is
  served** — Vite's dev server or the compiled `index.html`.

They are independent, so a development build can point at staging.

## Packaging

`pnpm dist:mac` and `pnpm dist:win` compile the renderer, then run
`scripts/dist.mjs`, which drives [electron-builder](https://www.electron.build)
with the shared settings in `electron-builder.config.cjs`. Installers land in
`release/`, named with the version, environment and architecture, e.g.
`LPA-Ecomms-Admin-0.1.0-production-universal.dmg`.

### Choosing the environment

An installed app has no shell environment and no `.env`, so the build bakes
its configuration in. `scripts/dist.mjs` validates the build machine's
`NODE_ENV`, `API_BASE_URL` and `API_TIMEOUT_MS` and writes them to
`app-config.json` inside the package; the installed app reads that file and
ignores its own environment. The values come from:

1. variables already set in the shell (CI secrets, for instance), then
2. `.env.<NODE_ENV>` when `NODE_ENV` is set and that file exists, otherwise
3. `.env`.

```bash
pnpm dist:mac                          # values from .env (development)
NODE_ENV=production pnpm dist:mac      # values from .env.production
```

`.env.staging` and `.env.production` follow `.env.example` and, like every
real `.env` file, are never committed. A missing or invalid variable stops the
build, not the installed app.

### Where each installer builds

| Installer | Build on |
| --- | --- |
| `.dmg` | macOS only |
| `.exe` | Windows (a Windows machine or a Windows CI runner) |

### Signing

Neither installer is signed with a paid certificate:

- **macOS** — the app is signed ad hoc, which lets it run on Apple Silicon
  but not pass Gatekeeper silently. The first launch needs right-click → Open,
  then Open. A Developer ID plus notarization would remove the prompt.
- **Windows** — SmartScreen shows "Windows protected your PC" on the first
  run; choose More info → Run anyway. A code-signing certificate would remove
  it.

## Architecture

Three processes with one boundary:

- `src/main/` performs all configuration reading and HTTP. Nothing else does.
- `src/main/preload.js` exposes named functions on `window.api` through
  `contextBridge`. There is no generic IPC passthrough.
- `src/renderer/` is React with no Node access and no network access.

The window runs with `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, and a Content Security Policy that forbids outbound
connections whenever the compiled renderer is served.

## Screens

The app opens on the admin sign-in screen (`components/AdminLogin.jsx`), built
from the "Admin Login" desktop mockup. It is a preview until the API gains
authentication: a form that passes `lib/loginRules.mjs` opens the app with no
request, and the session lives in memory only, so a restart signs you out.
Signing in opens the admin frame (`components/AdminLayout.jsx`): a sidebar
with the Dashboard, Users, Orders, Catalog and Settings sections. They are
previews labelled as such, because the API has no users, orders or statistics
endpoints yet; they read the sample data in `data/`:

- **Dashboard** shows sample figures and the five newest orders; "View all →"
  opens Orders.
- **Users** has working search, role filter, sorting and paging. Blocking and
  deleting change an in-memory copy; your own account cannot be blocked or
  deleted. Adding and editing stay disabled until a mockup defines their forms.
- **Orders** has the same table tools plus a panel, opened by View or Update
  status, with the order's summary and a status picker. A new status shows on
  the Dashboard too.
- **Catalog** (no mockup) lists categories and the products in each, with
  forms for a new category and a new product. The forms validate but save
  nothing yet: `createCategory` and `createProduct` in `App.jsx` are where the
  database calls go, and `data/catalog.mjs` documents the record shapes.
- **Settings** has the mockup's six tabs. Store info validates but saves
  nothing yet (`saveStoreInfo` in `App.jsx` is the seam). System status is
  the one live part: its REST API row asks the main process for `/health` and
  tells a database outage (Degraded) apart from an unreachable API (Down); the
  other services are samples. Uploading a logo, adding shipping methods,
  inviting admins and editing templates stay disabled until mockups exist.

Every change resets on sign-out.

Colours come from the `lpa` palette in `tailwind.config.js`; fonts are bundled
with `@fontsource` because the CSP allows only `'self'`.
