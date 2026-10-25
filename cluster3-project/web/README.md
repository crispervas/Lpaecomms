# Web — Lpaecomms e-commerce store

Server-rendered e-commerce storefront and REST API for Lpaecomms. Stack:
Express 5 + EJS + LESS, PostgreSQL via Prisma.

## Technology stack

Every technology used in this platform and what it is for. This list grows as
new tools are introduced.

| Technology | What it is for |
| --- | --- |
| **Node.js** | JavaScript runtime that executes the server-side code. |
| **pnpm** | Package manager. Installs dependencies through a global content-addressable store with hard links, which is faster and uses less disk. Scoped to this `web` package for now. |
| **Express 5** | Web framework. Handles HTTP routing and middleware, serving both the EJS views (browser users) and the REST API (mobile and desktop). |
| **EJS** | Server-side templating engine. Renders HTML pages on the server from `.ejs` templates. |
| **LESS** | CSS preprocessor. `styles/less/main.less` is the only entry point and compiles to `src/public/css/main.css`, which Express serves as a static asset. Class names are BEM-lite; the browser scripts write state classes only. |
| **less-watch-compiler** | Watches `styles/less/` and recompiles on save (`pnpm dev:css`). VS Code does the same through the Easy LESS extension, configured in the committed `.vscode/settings.json`. |
| **PostgreSQL** | Relational database. Central data store shared by all three platforms. |
| **Prisma** | ORM for PostgreSQL. Declares the schema, runs migrations, and provides the data-access client used by the model layer. |
| **Docker Compose** | Runs PostgreSQL locally in a reproducible, disposable container for development. |
| **dotenv** | Loads environment variables from a local `.env` file so configuration stays per-environment and out of the source code. |
| **node:test** | Node's built-in test runner. Runs the automated tests with no extra framework. |
| **supertest** | Sends HTTP requests to the Express app inside tests to assert route behaviour. |
| **zod** | Parses and validates API params, query strings and bodies; undeclared keys never reach Prisma. |
| **jsonwebtoken** | Signs and verifies the API's access tokens (HS256). |
| **bcrypt** | Hashes user passwords (cost 12). |
| **Bruno** | API client and documentation. The `bruno/` collection at the repository root is the source of truth for every REST endpoint and its three environments. |

## Folder structure (abridged)

```
cluster3-project/web/
├── src/
│   ├── app.js                      # Builds the Express app (middleware, EJS, static); does not listen
│   ├── server.js                   # Entry point: reads config, connects, app.listen()
│   ├── config/
│   │   └── env.js                  # Reads and validates env vars; fails fast if one is missing
│   ├── lib/
│   │   ├── prisma.js               # Prisma client singleton
│   │   ├── apiResponse.js          # { message, data, pagination } envelope
│   │   └── pagination.js           # List query parsing and the pagination block
│   ├── middlewares/                # requestTime, audit, validate, authenticate, authorize
│   ├── resources/                  # One declarative file per CRUD resource
│   ├── routes/
│   │   ├── index.js                # Mounts the view router and the API router
│   │   ├── views/
│   │   │   └── home.routes.js      # GET /            → HomeController.index
│   │   └── api/
│   │       └── health.routes.js    # GET /api/v1/health → HealthController.check
│   ├── controllers/
│   │   ├── home.controller.js      # class HomeController
│   │   └── health.controller.js    # class HealthController
│   ├── models/
│   │   └── health.model.js         # class HealthModel (wraps Prisma)
│   ├── views/
│   │   ├── layouts/
│   │   │   └── base.ejs            # Root layout (loads /css/main.css)
│   │   ├── pages/
│   │   │   └── home.ejs            # Home page, extends base.ejs
│   │   └── partials/
│   │       ├── header.ejs
│   │       └── footer.ejs
│   └── public/
│       └── css/
│           └── main.css            # Compiled stylesheet (gitignored)
├── styles/
│   └── less/                       # Hand-authored source: abstracts, base, layout, components, pages
├── prisma/
│   ├── schema.prisma               # Models: reference tables, users, catalogue, purchases
│   ├── migrations/                 # Generated SQL migrations
│   └── seed.js                     # Idempotent seed (reference data, demo catalogue, admin)
├── tests/
│   └── health.test.js              # GET /api/v1/health with node:test + supertest
├── docker-compose.yml              # postgres:16
├── .env.development.example        # Documents every variable, local values (versioned)
├── .env.staging.example            # Same variables for staging (versioned)
├── .env.production.example         # Same variables for production (versioned)
├── .env.<environment> / .env       # Real values, NOT versioned
├── package.json
└── README.md
```

## Architecture notes

- **MVC separation.** Routes map a URL to a controller method only. Controllers
  orchestrate (read the request, call the model, choose the response).
  Models talk to the database through Prisma. Views render HTML.
- **View vs API routes.** View routes render EJS templates; API routes return
  JSON. Neither depends on the other — they are two separate routers.
- **Controllers and models are ES2022 classes** with the model injected through
  the constructor, which keeps controllers testable with a fake model.
- **Injectable Prisma client.** `createApp({ prisma })` passes the client to the
  API routers; tests pass a recording fake (`tests/helpers/fakePrisma.js`), so
  the suite runs without a database except `tests/health.test.js`.

## Database

```bash
docker compose up -d        # PostgreSQL 16 (add --env-file .env.development if you use that file)
pnpm prisma migrate dev     # Development: apply migrations (and create new ones)
pnpm db:migrate             # Staging/production: apply committed migrations only
pnpm db:seed                # Reference data, 5 categories, 20 products, one admin
pnpm db:reset               # Drop, re-migrate and re-seed (destroys local data)
```

The seed is idempotent (upserts on unique codes/emails) and reads the admin's
credentials from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Environment variables

Each environment has its own file, chosen by `NODE_ENV` from the shell
(`src/config/loadEnv.js`, shared by the app, the Prisma CLI and the seed):

| `NODE_ENV` | File read | Template |
| --- | --- | --- |
| unset or `development` | `.env.development` | `.env.development.example` |
| `staging` | `.env.staging` | `.env.staging.example` |
| `production` | `.env.production` | `.env.production.example` |

When that file does not exist, `.env` is read instead, so a single local
`.env` keeps working. With neither, only the real environment is used — the
case on a host like Render, which sets the variables in its dashboard. A
file's values override the shell's, except `NODE_ENV` itself.

To run Prisma or the seed against production from your machine, put the
database's external URL in `.env.production`:

```bash
NODE_ENV=production pnpm db:migrate
NODE_ENV=production pnpm db:seed
```

Beyond the database and port:

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | yes | Signs API access tokens; at least 32 characters. |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `1h`). |
| `APP_TIMEZONE` | no | IANA zone for the audit stamps' local date/time (default `Australia/Brisbane`). |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | The administrator `prisma/seed.js` creates. |
| `NINJA_API_KEY` | no | Currency conversion; without it `/convert` answers 503. |

## REST API

Base path `/api/v1`, documented request by request in `bruno/lpaecomms-web`.

**Envelope.** Every response — success, error or 404 — is
`{ message, data, pagination }`. `pagination` is `null` except on lists, where it
is `{ total, page, limit, totalPages, count, hasNextPage, hasPrevPage }`. Errors
set `data: null` and add `errors: [{ field?, message }]` (plus `stack` outside
production).

**Lists** accept `page` (default 1), `limit` (default 10, max 100), `sort`,
`order` (`asc`/`desc`) and `search`, plus per-resource filters.

**Auth.** `POST /auth/login` with `{ email, password }` returns a JWT. Send it
as `Authorization: Bearer <token>`.

| Resource | Read | Write |
| --- | --- | --- |
| `categories`, `products` | public | `ADMIN` |
| `users`, `roles`, `genders`, `document-types`, `templates`, `purchases` | `ADMIN` | `ADMIN` |

Each resource has `GET /{resource}`, `GET /{resource}/:id`, `POST /{resource}`,
`PUT /{resource}/:id` (partial) and `DELETE /{resource}/:id`. Deletes are soft:
`status: 0`, `statusName: "INACTIVE"` (and `deletedAt` on users), and deleted
rows vanish from every read. Purchases compute their totals server-side.

**Audit.** Writes fill the `created` / `updated` JSON columns with
`{ client, server, serverDate, serverTime, unixTime, user, role }`, taken from
the request time, `APP_TIMEZONE` and the token. Validation runs first and drops
any audit or status field a client sends, so the stamp cannot be forged.
