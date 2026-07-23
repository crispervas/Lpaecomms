# Web — LPA e-commerce store

Server-rendered e-commerce storefront and REST API for Logic Peripherals
Australia (LPA). Stack: Express 5 + EJS + Tailwind CSS, PostgreSQL via Prisma.

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
│   │       └── health.routes.js    # GET /api/health  → HealthController.check
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
│   └── health.test.js              # GET /api/health with node:test + supertest
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
