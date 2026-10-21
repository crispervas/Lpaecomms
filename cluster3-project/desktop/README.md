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
from the "Admin Login" desktop mockup. A form that passes `lib/loginRules.mjs`
signs in through `window.api.signIn`: the main process posts the credentials to
`POST /auth/login`, refuses any account whose role is not `ADMIN`
(`services/session.js`), and keeps the access token to itself — the renderer
receives only the account's name and email. The token lives in main-process
memory, so quitting the app signs you out; "Sign out" forgets it at once.
Wrong credentials, a non-admin account and an unreachable API each show their
own message (`lib/signInResult.mjs`). Signing in opens the admin frame
(`components/AdminLayout.jsx`): a sidebar with the Dashboard, Users, Orders,
Catalog and Settings sections.

Every screen except Settings reads and writes the real database. The renderer
calls named functions on `window.api` (`listProducts`, `updateOrder`,
`blockUser`, …); the main process (`services/adminApi.js`) sends each with the
session's token, fetches every page of a list, and checks ids and bodies
before anything leaves the process. A 401 ends the session and returns to
sign-in with "Your session has expired. Please sign in again." Rows are
mapped to the screens' shapes in `lib/apiMapping.mjs`, and every successful
write reloads the list it touched.

- **Dashboard** shows Total users, Total orders, Products live and Revenue
  from `GET /stats`, products per category, and the five newest orders;
  "View all →" opens Orders.
- **Users** has search, role filter, sorting and paging; New user and Edit
  open a form (`components/UserForm.jsx`, rules in `lib/userRules.mjs`);
  Block/Unblock and Delete act at once (delete after a confirmation). Your own
  account cannot be blocked or deleted — the API refuses it too.
- **Orders** has the same table tools plus a panel, opened by View or Update,
  that edits the shipping status, payment status, reference and invoice.
  Orders are placed by customers, so there is no New order. Delete asks first.
- **Catalog** lists categories and the products in each — drafts included —
  with create, edit and delete for both. A category that still holds products
  cannot be deleted; the API's reason shows in the confirmation.
- **Settings** has the mockup's six tabs and is still a preview: Store info
  validates but saves nothing (`saveStoreInfo` in `App.jsx` is the seam).
  System status is live: its REST API row asks the main process for `/health`
  and tells a database outage (Degraded) apart from an unreachable API (Down).

Colours come from the `lpa` palette in `tailwind.config.js`; fonts are bundled
with `@fontsource` because the CSP allows only `'self'`.
