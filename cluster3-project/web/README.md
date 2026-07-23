# Web — Lpaecomms e-commerce store

Server-rendered e-commerce storefront and REST API for Lpaecomms. Stack:
Express 5 + EJS + Tailwind CSS, PostgreSQL via Prisma.

## Technology stack

Every technology used in this platform and what it is for. This list grows as
new tools are introduced.

| Technology | What it is for |
| --- | --- |
| **Node.js** | JavaScript runtime that executes the server-side code. |
| **pnpm** | Package manager. Installs dependencies through a global content-addressable store with hard links, which is faster and uses less disk. Scoped to this `web` package for now. |
| **Express 5** | Web framework. Handles HTTP routing and middleware, serving both the EJS views (browser users) and the REST API (mobile and desktop). |
| **EJS** | Server-side templating engine. Renders HTML pages on the server from `.ejs` templates. |
| **Tailwind CSS** | Utility-first CSS framework. Provides all styling for the views; compiled into the static assets directory. |
| **PostgreSQL** | Relational database. Central data store shared by all three platforms. |
| **Prisma** | ORM for PostgreSQL. Declares the schema, runs migrations, and provides the data-access client used by the model layer. |
| **Docker Compose** | Runs PostgreSQL locally in a reproducible, disposable container for development. |
| **dotenv** | Loads environment variables from a local `.env` file so configuration stays per-environment and out of the source code. |
| **node:test** | Node's built-in test runner. Runs the automated tests with no extra framework. |
| **supertest** | Sends HTTP requests to the Express app inside tests to assert route behaviour. |
| **Bruno** | API client and documentation. The `bruno/` collection at the repository root is the source of truth for every REST endpoint and its three environments. |

## Planned folder structure

```
cluster3-project/web/
├── src/
│   ├── app.js                      # Builds the Express app (middleware, EJS, static); does not listen
│   ├── server.js                   # Entry point: reads config, connects, app.listen()
│   ├── config/
│   │   └── env.js                  # Reads and validates env vars; fails fast if one is missing
│   ├── lib/
│   │   └── prisma.js               # Prisma client singleton
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
│   │   │   └── base.ejs            # Root layout (loads /css/tailwind.css)
│   │   ├── pages/
│   │   │   └── home.ejs            # Home page, extends base.ejs
│   │   └── partials/
│   │       ├── header.ejs
│   │       └── footer.ejs
│   └── public/
│       └── css/
│           └── tailwind.css        # Compiled Tailwind output (gitignored)
├── styles/
│   └── tailwind.css                # Tailwind source with @tailwind directives (versioned)
├── prisma/
│   └── schema.prisma               # datasource + generator (no models yet)
├── tests/
│   └── health.test.js              # GET /api/v1/health with node:test + supertest
├── tailwind.config.js              # content globs INCLUDE src/views/**/*.ejs
├── docker-compose.yml              # postgres:16
├── .env.example                    # Documents every variable (versioned)
├── .env                            # Real values, NOT versioned
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
