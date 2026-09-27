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

## Screens

The app opens on the admin sign-in screen (`components/AdminLogin.jsx`), built
from the "Admin Login" desktop mockup. It is a preview until the API gains
authentication: a form that passes `lib/loginRules.mjs` opens the app with no
request, and the session lives in memory only, so a restart signs you out.
Signing in opens the admin frame (`components/AdminLayout.jsx`): a sidebar
with the Dashboard, Users, Orders, Catalog and Settings sections. Settings stays
disabled until its screen exists. The built screens are previews labelled as
such, because the API has no users, orders or statistics endpoints yet; they
read the sample data in `data/`:

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

Every change resets on sign-out. The API health panel
(`components/ApiStatus.jsx`) is unmounted until the Settings screen gives it
its "System status" home.

Colours come from the `lpa` palette in `tailwind.config.js`; fonts are bundled
with `@fontsource` because the CSP allows only `'self'`.
