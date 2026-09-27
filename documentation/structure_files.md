# Project Structure & Architecture

This document explains how the repository is organized and how the web platform
is built around the **MVC** (Model–View–Controller) pattern.

> Keep this file updated. Whenever a folder or a meaningful file is added, add it
> here with a one-line explanation of its role. Structure and documentation must
> not drift apart.

---

## 1. Repository layout (top level)

```
Lpaecomms/
├── .vscode/             # Shared editor config: compile-on-save for LESS, recommended extensions
├── CLAUDE.md            # Working agreement and architecture rules for the repo
├── README.md            # Project overview
├── bruno/               # API contracts and docs (Bruno collections)
├── cluster3-project/    # The product, delivered on three platforms
│   ├── web/             # Server-rendered site + REST API (Express + EJS)
│   ├── mobile/          # Ionic + React client (consumes the REST API)
│   ├── desktop/         # Electron client (consumes the REST API)
│   └── brand/           # LPA logo masters + export to every platform (see brand/README.md)
└── documentation/       # Human-written docs, including this file
```

One product, three platforms, integrated through a **single REST API**. That API
lives in `cluster3-project/web`, which is both the website and the API server.
The mobile and desktop apps do not share UI code with the web; the REST API is
the only contract that binds all three together. The logo is the one asset
they share: `cluster3-project/brand` holds its masters and exports a copy into
each platform (mobile `assets/`, web `src/public/favicon.*`, desktop
`resources/icon.*`).

### `bruno/` — API contracts

```
bruno/lpaecomms-web/
├── bruno.json                     # Collection definition
├── environments/                  # One file per environment
│   ├── development.bru
│   ├── staging.bru
│   └── production.bru
├── health/
│   └── get-health.bru             # A request + its docs (purpose, params, responses)
├── products/
│   ├── get-products.bru           # Product catalogue request + docs (pairing, truncation, caching)
│   └── get-product.bru            # One product by id + docs (400/404/502)
├── categories/
│   └── get-categories.bru         # Category list request + docs (populated only, caching)
├── catalog/
│   └── get-catalog.bru            # Paged catalogue request + docs (filter, offset/limit, hasMore)
├── contact/
│   └── post-contact.bru           # Contact message request + docs (202/422/400, no delivery)
├── currency/
│   └── get-convert.bru            # Currency conversion request + docs (caching, identity short-circuit)
└── password/
    └── get-password-breaches.bru  # Breached password lookup request + docs (k-anonymity)
```

Bruno is the **single source of truth for the API**. Every endpoint has a `.bru`
request whose `docs` block documents purpose, auth, parameters, and responses.
An endpoint without its Bruno request is considered unfinished.

---

## 2. The web platform (`cluster3-project/web`)

```
web/
├── .env.example          # Documents every environment variable (no secrets)
├── .env                  # Local values — never committed
├── docker-compose.yml    # Local services (e.g. PostgreSQL)
├── package.json          # Scripts and dependencies
├── prisma.config.js      # Prisma configuration
├── prisma/
│   └── schema.prisma     # Database schema (models, relations)
├── styles/
│   └── less/             # Hand-authored stylesheet SOURCE (input to the build)
│       ├── main.less             # The only entry point; @imports everything below in cascade order
│       ├── abstracts/            # Tokens, breakpoint mixins, shared mixins, the theme blocks — most files emit nothing on their own; _tokens.less (:root) and _themes.less (html[data-theme]) do compile to real rules
│       ├── base/                 # Document reset, page typography, the fixed utility layer
│       ├── layout/               # Page shell, header, footer
│       ├── components/           # Reused across two or more pages (button, card, form field…)
│       └── pages/                # Per-page composition (home, catalog, product, about…)
├── tests/
│   ├── health.test.js             # Health endpoint (needs the dev database running)
│   ├── errorHandler.test.js       # Error middleware: JSON for API, HTML for the browser
│   ├── products.api.test.js       # Product catalogue endpoint, response shape, and caching
│   ├── convert.api.test.js        # Currency conversion endpoint, validation order, and caching
│   ├── passwordBreaches.api.test.js # Breached password lookup endpoint (k-anonymity)
│   ├── productModel.test.js       # ProductModel.listFeatured: field mapping, limit, cache isolation
│   ├── categoryModel.test.js      # CategoryModel: empty-category filtering, probes, cache
│   ├── contactValidation.test.js  # Contact form rules: required, formats, limits, browser/server parity
│   ├── authValidation.test.js     # Login/sign-up rules: per-mode fields, password minimum
│   ├── account.test.js            # Account page: profile rules, tab whitelist, controller locals (preview never saves)
│   ├── cart.test.js               # Cart cookie rules (parse, limits, merge) and the controller's pricing, pruning and redirects
│   ├── catalogueCache.test.js     # Catalogue cache: stale-while-revalidate, shared in-flight requests, home fetching side by side
│   ├── stylesheetTokens.test.js   # Every palette value reaches :root/_tokens.less or its theme block; no colour escapes the token layer
│   ├── themeContrast.test.js      # Computes WCAG ratios from the palette for all four themes; AA for text and 3:1 for control borders, AAA in contrast
│   ├── textScale.test.js          # No px font-size in styles/less/; the three text-size steps compile to 100%/112.5%/125%
│   ├── appearanceContract.test.js # THEMES/TEXT_SIZES in lib/preferences.js name exactly what the stylesheet renders, in both directions
│   ├── preferences.test.js        # Preference whitelist, cookie parsing/serialisation, and the safe-return-path guard
│   ├── cookies.test.js            # persistentCookieOptions(): the secure flag by environment and the other cookie attributes
│   ├── preferences.routes.test.js # GET/POST /preferences: cookie round-trip, whitelist rejection, returnTo guard, the 204 background-save path
│   ├── recentlyViewed.test.js     # Browsing-history cookie: ordering, dedupe, truncation at RECENT_LIMIT
│   ├── recommendations.test.js    # ProductModel.findByIds and findByCategoryExcluding against the external feed
│   └── personalisation.test.js    # Home page's dominant-category inference and its failure isolation between the two blocks
└── src/                  # Application code — see section 3
```

Two stylesheet paths that are easy to confuse:

- `styles/less/` is the **source** you edit.
- `src/public/css/main.css` is the **compiled output** the browser loads. It is
  generated by `pnpm build:css` and must not be edited by hand; it is gitignored.

`main.less` imports in cascade order — abstracts, base, layout, components,
pages — so a later rule wins on file order rather than on an escalating selector
or `!important`. Keep that order when adding a file.

Class names are BEM-lite (`.block`, `.block__element`, `.block--modifier`) plus
state classes (`.is-active`, `.is-open`, `.has-error`). The browser scripts write
**state classes only** — never colours, never layout. That is what lets
`mashup-map.js` say "this map failed" (`.mashup-map--failed`) without knowing
what a failed map looks like.

> **Design tokens.** `styles/less/abstracts/_tokens.less` names the home mockup's
> palette (`@canvas`, `@surface`, `@subtle`, `@ink`, `@muted`, `@line`,
> `@accent`, `@tint`), the feedback colours, and the two families
> (`@font-display`, `@font-sans`). Rules use those names, never raw hex, so a
> brand change is one edit in that file. The mockup's `#9A9C9A` is deliberately
> absent: it fails WCAG AA on the canvas, and `@muted` replaces it.

> **The palette, the themes, and the appearance stylesheets.**
> `abstracts/_palette.less` holds every raw colour value in the project — the
> only file allowed to, enforced by `tests/stylesheetTokens.test.js` — and
> `_tokens.less` republishes each one as a `--custom-property` on `:root` plus
> the `@name: var(--name)` LESS variable the rules read. `abstracts/_themes.less`
> redeclares those custom properties inside `html[data-theme="midnight"]`,
> `html[data-theme="forest"]` and `html[data-theme="contrast"]` blocks;
> `daylight` has no block of its own, since it is whatever `:root` already
> publishes. Four component and page stylesheets style the customisation and
> personalisation UI: `components/_appearance.less` (the shared theme/text-size
> radio form), `pages/_preferences.less` (the `/preferences` page around it),
> `components/_appearance-panel.less` (the header's popover copy of the same
> form), and `components/_recently-viewed.less` (the home page's "Recently
> viewed" and "Picked for you" strips).

> **Catalog filtering.** The catalog's filter lives in the URL
> (`/catalog?category=<slug>`), not in memory, so a filtered view is shareable
> and the back button works. `CategoryModel.listCategories()` keeps only
> categories that hold products: the demo feed accepts writes from anyone and
> accumulates other people's test categories. An unknown slug answers 404 —
> but only when the category list loaded, since otherwise a third party being
> down would turn a valid URL dead.

> **`productDetail` vs `product`.** `controllers/product.controller.js` belongs
> to the **API** — it serves `GET /api/v1/products` and `GET /api/v1/products/:id`
> to the mobile and desktop clients. The view controller for the product page is therefore
> `productDetail.controller.js`, with matching route and page names. Renaming
> the API's controller for symmetry would move a file two other platforms
> depend on, to buy nothing.

> **The detail page fails outright.** The home and catalog pages own content of
> their own, so a catalogue they cannot read costs them one section. The product
> page *is* the product: a feed it cannot read reaches the error page, and a
> product that does not exist reaches the 404 page. Only its "You might also
> like" row degrades, because that row is an extra.

> **The mashup cards are shared between a template and a script.** Each card
> reads top-down: what the mashup is and what it consumes, then the live widget
> below a rule. The widget half is driven from `public/js/`, and the coupling
> runs both ways. The scripts find their elements **by id** — rename
> `#mashup-strength-bar` and the page still renders while the meter silently
> dies — and they **overwrite `className` wholesale** on the map container, the
> strength segments, the strength label and the breach status line. A palette
> change applied only to the template therefore reverts the moment the user
> types. `tests/mashup.view.test.js` pins the ids; the class strings have to be
> kept in step by hand, which is why both files say so at the point of use.

> **Forms are validated twice, from one set of rules.** A form declares itself
> as a table of fields — `lib/contactValidation.js` for Contact,
> `lib/authValidation.js` for the login page — and `lib/formRules.js` applies
> it. The controller validates with the table;
> `components/shared/formField.ejs` renders each rule as a native HTML attribute
> (`required`, `maxlength`, `minlength`, `pattern`) and each message into a
> `data-error-*` attribute; `public/js/form-validation.js` reads those
> attributes back out of the DOM for any form marked `data-validate`. **The
> browser therefore holds no copy of any rule or message** — a new rule is added
> in one file and reaches all three, and a new form is a new table rather than a
> second copy of the script.
>
> Three things worth keeping in mind. The client script is a convenience and
> never a gate, because a POST can arrive from anywhere and the server re-checks
> everything. **A field's pattern must carry no regex flag**, since the HTML
> `pattern` attribute cannot express one and a `/i` would have the two
> validators disagree about the same input; a test pins that invariant. And a
> field marked `preserveWhitespace` — passwords — must not be trimmed on either
> side, or a password of spaces is empty to one validator and valid to the
> other.

> **The login page carries two modes on one URL.** `?tab=signup` selects
> sign-up, and the tabs are **links, not buttons**, so the page works with no
> JavaScript. That is also why the form posts a hidden `mode` field: a rejected
> sign-up has to come back rendered as sign-up, and a client-only tab would drop
> the reader onto Log in and discard what they typed. Both `?tab=` and the
> posted `mode` go through the same whitelist, since both arrive from the
> client. The controller strips the password out of every render — echoing it
> back would write it into the browser cache, any proxy log, and view-source.
> None of this authenticates anyone: there is no user model yet, and every
> well-formed submission says so.

> **Customisation is chosen; personalisation is decided.** Two unrelated
> cookies carry this distinction all the way through the code. `lpa_prefs`
> (`lib/preferences.js`, `config/cookies.js`, `config/preferences.js`) holds
> what the visitor picked on `/preferences` or the header panel, whitelisted
> against `THEMES`/`TEXT_SIZES` on every read so an edited or stale cookie can
> only ever fall back to the default, never reach the markup unchecked.
> `lpa_recent` (`lib/recentlyViewed.js`) holds what the visitor did — the
> products they opened, written by `productDetail.controller.js` with no
> control anywhere to add, edit or clear it. `home.controller.js` reads that
> second cookie to build "Recently viewed" (a replay) and, from it, the
> dominant category the visitor has been reading, to build "Picked for you" (an
> inference) via `product.model.js`'s `findByCategoryExcluding`. Both
> personalisation blocks are optional by construction: a lookup that fails
> costs its own block, never the home page, and a visitor with no history sees
> neither.

---

## 3. Inside `src/` — the application

```
src/
├── server.js             # Entry point: starts the HTTP server
├── app.js                # App factory: builds & configures Express (no listen)
├── config/               # Cross-cutting configuration and middleware
│   ├── env.js            # Reads & validates environment variables (fails fast)
│   ├── errorHandler.js   # Error middleware chain (logErrors → wrapErrors → errorHandler)
│   ├── notFoundHandler.js# 404 handlers: JSON for API, HTML page for the browser
│   ├── apiCors.js        # CORS headers for every /api response, success and failure alike
│   ├── cookies.js        # Shared attributes for a persistent first-party cookie (httpOnly, sameSite, secure, 1-year maxAge)
│   ├── cart.js           # Middleware: res.locals.cartCount for the header badge, counted from the cart cookie
│   └── preferences.js    # Middleware: resolves res.locals.preferences from the cookie for every template
├── routes/               # URL → controller mapping (the routing layer)
│   ├── index.js          # registerRoutes(): mounts view routes at / and API at /api/v1
│   ├── views/            # View routes (return HTML)
│   │   ├── home.routes.js
│   │   ├── about.routes.js
│   │   ├── contact.routes.js
│   │   ├── auth.routes.js
│   │   ├── account.routes.js # GET/POST /account (Profile and Orders tabs; preview, nothing saved)
│   │   ├── cart.routes.js    # GET /cart; POST /cart/items (add), /cart/items/:id (quantity), /cart/items/:id/remove
│   │   ├── mashup.routes.js
│   │   ├── catalog.routes.js
│   │   ├── productDetail.routes.js
│   │   └── preferences.routes.js # GET/POST /preferences
│   └── api/              # API routes (return JSON)
│       ├── health.routes.js
│       ├── product.routes.js
│       ├── category.routes.js
│       ├── catalog.routes.js
│       ├── contact.routes.js
│       ├── currency.routes.js
│       └── password.routes.js
├── controllers/          # CONTROLLER: request in, response out
│   ├── home.controller.js
│   ├── about.controller.js
│   ├── contact.controller.js
│   ├── auth.controller.js # Login page; a well-formed log in redirects to the Account preview
│   ├── account.controller.js # Account page: show() by ?tab=, saveProfile() validates and answers with a preview notice
│   ├── cart.controller.js # Cart page priced from the catalogue; add/update/remove write lpa_cart and redirect 303
│   ├── mashup.controller.js
│   ├── health.controller.js
│   ├── product.controller.js
│   ├── category.controller.js # API: GET /api/v1/categories
│   ├── catalogApi.controller.js # API: GET /api/v1/catalog (paged, category filter)
│   ├── contactApi.controller.js # API: POST /api/v1/contact (web form rules, 202/422)
│   ├── currency.controller.js
│   ├── password.controller.js
│   ├── catalog.controller.js  # Catalog page: category filter, product grid
│   ├── productDetail.controller.js # One product's page: gallery, price, related; records the view in lpa_recent
│   └── preferences.controller.js # /preferences: show(), save() (whitelist check, cookie write, redirect or 204)
├── models/               # MODEL: data access (database and external sources)
│   ├── health.model.js
│   ├── product.model.js  # External catalogue: storefront list + store locations
│   ├── currency.model.js  # Exchange rates via API Ninjas (cached)
│   ├── breach.model.js  # Have I Been Pwned range lookup (k-anonymity)
│   ├── category.model.js  # Catalogue categories, empty ones filtered out
│   └── account.model.js  # Sample profile and order history until authentication exists
├── lib/                  # Shared infrastructure helpers
│   ├── prisma.js         # Single shared PrismaClient instance (a singleton)
│   ├── formRules.js      # Applies a field table: normalise, validate, derive HTML patterns
│   ├── contactValidation.js # Contact form rules, shared by controller, view and browser
│   ├── authValidation.js # Login and sign-up rules, keyed by mode
│   ├── accountValidation.js # Profile form rules, the ?tab= whitelist, avatar initials
│   ├── cart.js           # lpa_cart cookie: parse/serialise ids and quantities, limits (99 units, 20 lines), totals in cents
│   ├── preferences.js    # THEMES/TEXT_SIZES whitelists, cookie parse/serialise, safe-return-path guard — no Express import
│   └── recentlyViewed.js # Browsing-history cookie: parse, push (dedupe + move-to-front), serialise, RECENT_LIMIT (8)
├── views/                # VIEW: server-rendered EJS templates
│   ├── layouts/
│   │   └── base.ejs      # HTML document shell; wraps every page
│   ├── partials/
│   │   ├── header.ejs    # Shared header / navigation, plus the appearance-panel toggle button
│   │   ├── footer.ejs    # Shared footer
│   │   └── appearancePanel.ejs # Header popover wrapping appearanceForm.ejs; opened by public/js/appearance.js
│   ├── components/       # Page fragments, one folder per page that owns them
│   │   ├── home/
│   │   │   ├── homeHero.ejs      # Home hero: headline, CTAs, product shot
│   │   │   ├── homeCategories.ejs # Home "Shop by category" grid (static markup)
│   │   │   ├── homeTrending.ejs  # Home "Trending now" grid (products local)
│   │   │   └── homeRecentlyViewed.ejs # "Recently viewed" and "Picked for you": both personalisation blocks, either may be empty
│   │   ├── catalog/
│   │   │   ├── catalogFilters.ejs # Catalog category pills (links, URL-driven)
│   │   │   └── catalogResults.ejs # Catalog grid, count label and empty states
│   │   ├── product/
│   │   │   ├── productGallery.ejs  # Product gallery: main image plus the rest
│   │   │   ├── productPurchase.ejs # Quantity and add-to-cart form, posting to /cart/items
│   │   │   └── productRelated.ejs  # "You might also like": same category, current excluded
│   │   ├── about/
│   │   │   ├── aboutMission.ejs  # About mission block: eyebrow and headline (static markup)
│   │   │   ├── aboutStory.ejs    # About story: platform panel and prose, two columns
│   │   │   └── aboutVideo.ejs    # About "What does Mashup mean?" explainer embed
│   │   ├── mashup/
│   │   │   ├── mashupOne.ejs   # Products + Location card
│   │   │   ├── mashupTwo.ejs   # Products + Currency Converter card
│   │   │   ├── mashupThree.ejs # Secure Password Checker card
│   │   │   └── dataSource.ejs  # One row of a card's "Data sources" panel
│   │   ├── contact/
│   │   │   ├── contactChannels.ejs # Email / phone / studio cards (static markup)
│   │   │   ├── contactForm.ejs     # The form card: success notice and the four fields
│   │   │   └── contactWorkshop.ejs # "Visit the workshop": map, address, hours, directions
│   │   ├── auth/
│   │   │   ├── authPanel.ejs  # Tinted left half: illustration and the account promise
│   │   │   ├── authTabs.ejs   # Log in / Sign up switch, rendered as links
│   │   │   └── authForm.ejs   # The form itself, both modes, with the hidden mode field
│   │   ├── account/
│   │   │   ├── accountSidebar.ejs # Avatar card, Profile/Orders links, Log out
│   │   │   ├── accountProfile.ejs # Personal details form and the (disabled) password change
│   │   │   └── accountOrders.ejs  # One card per order: status pill and AUD total
│   │   ├── cart/
│   │   │   ├── checkoutSteps.ejs # Cart / Shipping / Payment indicator (ordered list, aria-current=step)
│   │   │   ├── cartLine.ejs      # One line: image, name, −/+ submit-button stepper, total, remove
│   │   │   └── cartSummary.ejs   # Subtotal, shipping "calculated at checkout", estimated total
│   │   ├── preferences/
│   │   │   └── appearanceForm.ejs # The theme and text-size radio groups; included by both preferences.ejs and appearancePanel.ejs via idPrefix
│   │   └── shared/           # Fragments no single page owns
│   │       ├── productCard.ejs # One product card, used by home, catalog and product
│   │       └── formField.ejs   # One label + control + error line, driven by a rule table
│   └── pages/            # Page bodies, injected into the layout
│       ├── home.ejs
│       ├── about.ejs
│       ├── contact.ejs
│       ├── login.ejs
│       ├── account.ejs  # Sidebar beside the Profile or Orders tab
│       ├── cart.ejs     # Checkout step 1: lines beside the order summary; Shipping disabled until checkout exists
│       ├── mashup.ejs
│       ├── catalog.ejs
│       ├── productDetail.ejs
│       ├── preferences.ejs # The full appearance settings page; works with no JavaScript
│       ├── 404.ejs       # Not Found page
│       └── error.ejs     # Generic error page (any failed browser request)
└── public/               # Static assets served as-is
    ├── favicon.svg|.ico  # LPA logo for browser tabs, exported from cluster3-project/brand
    ├── apple-touch-icon.png # iOS home-screen bookmark icon, same export
    ├── css/
    │   └── main.css      # Compiled stylesheet (build output, gitignored)
    ├── img/              # Image assets (hero-product.webp|jpg|png, supplied by hand)
    └── js/
        ├── nav.js         # Small client-side script for the nav
        ├── contact-map.js # Leaflet map on the Contact page (mashup: company location map)
        ├── form-validation.js # Inline validation for any form[data-validate] (the server still decides)
        ├── quantity-stepper.js # Reveals and drives the − / + buttons of any form[data-quantity-stepper]
        ├── mashup-map.js   # Leaflet map on the Mashups page (mashup 1: products + location)
        ├── mashup-currency.js # Currency converter on the Mashups page (mashup 2)
        ├── mashup-password.js # Password strength + breach check on the Mashups page (mashup 3)
        └── appearance.js       # Opens/closes the header panel, applies a choice instantly, persists it in the background
```

> **Per-page assets without a bundler.** `layouts/base.ejs` accepts two optional
> locals — `styles` (stylesheet URLs added to `<head>`) and `scripts` (script
> URLs loaded in order before `</body>`). A controller passes them to load a
> library only where it is needed. Example: the Contact controller passes the
> Leaflet CDN stylesheet/script plus `/js/contact-map.js`.

> **`partials/` vs `components/`.** `partials/` holds the site chrome that
> `layouts/base.ejs` wraps around every page (header, footer). `components/`
> holds fragments a *page* pulls in for its own content, like the three mashup
> cards. EJS has no component system — `include` is textual inclusion sharing the
> parent's scope — so two conventions keep it manageable: **write literal include
> paths** (a name built by concatenation only fails at render time and cannot be
> grepped), and **pass what the component needs as the second argument**
> (`include('../components/mashup/mashupOne', { products })`) instead of relying
> on the parent's locals leaking in. Each component states its expected locals in
> its header comment.

> **One folder per page inside `components/`.** A component lives in the folder
> named after the page that includes it (`catalog/`, `product/`, `home/`,
> `about/`, `mashup/`), so the fragments of a page are found together instead of
> by reading a flat list of fifteen names. `shared/` is the exception and holds
> what no single page owns — `productCard.ejs` is included by the home grid, the
> catalog grid and the related row. **A component belongs in `shared/` the moment
> a second page includes it**; leaving it under the first page's folder makes an
> unrelated page depend on that page's directory.

### Why `server.js` and `app.js` are separate

`app.js` builds the Express app but does **not** start listening. `server.js`
imports that app and calls `listen()`. Splitting them lets tests exercise the
routes with supertest without binding a real TCP port (see `tests/health.test.js`).

---

## 4. MVC explained

**MVC** splits the app into three responsibilities so each layer changes for one
reason only:

| Layer | Responsibility | Where it lives here |
| --- | --- | --- |
| **Model** | Data and business rules. Talks to the database. Knows nothing about HTTP. | `src/models/*.model.js`, backed by `src/lib/prisma.js` and `prisma/schema.prisma` |
| **View** | Presentation. Turns data into what the user sees (HTML). | `src/views/**/*.ejs` |
| **Controller** | Coordinator. Reads the request, asks the Model for data, picks a View (or builds JSON), and sends the response. | `src/controllers/*.controller.js` |

Two supporting layers sit around MVC:

- **Routes** (`src/routes/`) map a URL + HTTP method to a controller method.
  They are the front door; they contain no business logic.
- **Config / middleware** (`src/config/`) handle cross-cutting concerns
  (environment, errors, 404s) that apply across many routes.

### Golden rule of this codebase

The web layer and the API layer share **one** Express instance but must stay
independent:

- **View routes render templates.** They return HTML.
- **API routes return JSON.**
- A view route must never depend on an API route, or the reverse.

### Request lifecycle — a browser page (View flow)

```
Browser: GET /about
   │
   ▼
server.js → app.js (Express)
   │   global middleware (static assets, body parsers, res.locals.currentPath)
   ▼
routes/index.js  → routes/views/about.routes.js   (matches "/about")
   │
   ▼
controllers/about.controller.js   → res.render('layouts/base', { title, page: 'about' })
   │
   ▼
views/layouts/base.ejs
   │   includes partials/header.ejs
   │   includes pages/about.ejs        ← the page body
   │   includes partials/footer.ejs
   ▼
HTML response to the browser
```

Here the Controller renders a View directly — the About page needs no database,
so no Model is involved.

### Request lifecycle — an API endpoint (Model flow)

```
Client: GET /api/v1/health
   │
   ▼
routes/index.js → routes/api/health.routes.js   (matches "/health" under /api/v1)
   │
   ▼
controllers/health.controller.js   .check()
   │
   ▼
models/health.model.js   → queries the database via lib/prisma.js
   │
   ▼
res.json({ status, db })   → JSON response to the client
```

Here the Controller uses a **Model** to reach the database and returns JSON, not
a template. The Model never touches `req`/`res`; the Controller never writes SQL.

### Error and 404 handling

These run at the end of the middleware chain, after every route has had its
chance to match (see `app.js`):

```
Something calls next(err)                      Unmatched request
   │                                               │
   ▼                                               ▼
config/errorHandler.js:                         config/notFoundHandler.js:
   logErrors    (log — every environment)          /api/*  → notFoundHandlerApi  → JSON 404
   wrapErrors   (force a Boom error)               others  → notFoundHandlerWeb → renders pages/404.ejs
   errorHandler (send the response)
      /api/*  → JSON body
      others  → renders pages/error.ejs
```

Both chains are split by client for the same reason as the routes: REST clients
(mobile, desktop) expect JSON, browsers expect an HTML page. A view route that
answered `next(err)` with JSON would break that separation.

Two rules the error chain follows deliberately:

- **Logging and disclosure are separate decisions.** The server records every
  error in all three environments; what production withholds is the stack trace
  and message sent *to the client*, never the log entry.
- **The error page must not be able to loop.** `errorHandler` bails out to
  Express's default handler when the response has already started streaming, and
  falls back to plain text if `pages/error.ejs` itself fails to render.

---

## 5. How to add a new feature (checklist)

When adding, for example, a `products` page or endpoint, touch the layers in
this order and update this document:

1. **Model** — add `src/models/products.model.js` if it needs the database, and
   update `prisma/schema.prisma`.
2. **Controller** — add `src/controllers/products.controller.js`.
3. **View** (web only) — add `src/views/pages/products.ejs`.
4. **Route** — add `src/routes/views/products.routes.js` (HTML) or
   `src/routes/api/products.routes.js` (JSON), then mount it in
   `src/routes/index.js`.
5. **Bruno** (API only) — add the `.bru` request and its docs, and confirm it
   resolves in all three environments.
6. **Docs** — add the new files to section 3 above.

---

## Quick reference: file → MVC role

| Pattern | Role |
| --- | --- |
| `*.model.js` | Model (data access) |
| `*.controller.js` | Controller (request/response coordination) |
| `views/**/*.ejs` | View (presentation) |
| `*.routes.js` | Routing (URL → controller) |
| `config/*.js` | Cross-cutting middleware / configuration |

---

## 6. The mobile platform (`cluster3-project/mobile`)

```
mobile/
├── .env.example              # Documents VITE_API_BASE_URL (read by api/client.ts)
├── assets/                   # Icon + splash PNGs for `pnpm assets`, exported from brand/
├── scripts/resize-ios-splash.mjs  # `pnpm assets` step: shrinks the iOS splash so it renders
├── capacitor.config.ts       # App id com.lpaecomms.mobile, webDir: dist
├── ionic.config.json         # Ionic CLI project metadata
├── ios/                      # Gitignored — regenerate with `npx cap add ios`
├── android/                  # Gitignored — regenerate with `npx cap add android`
├── public/img/hero-product.png  # Home hero, copied from the web platform
├── public/favicon.png        # Browser-build favicon, exported from brand/
└── src/
    ├── main.tsx              # React root; loads the bundled fonts
    ├── App.tsx               # IonTabs shell: Home, Catalog, Cart, Login
    ├── api/
    │   ├── client.ts         # apiGet → {ok, status, data, error}; 8 s timeout
    │   ├── products.ts       # fetchProducts → validated Product[]; parseProduct shared
    │   ├── categories.ts     # fetchCategories → validated CatalogCategory[]
    │   ├── catalog.ts        # fetchCatalogPage → one page + hasMore
    │   ├── product.ts        # parseProductId, fetchProduct → validated ProductDetail
    │   └── contact.ts        # sendContact; fieldErrors maps 422 validation to fields
    ├── context/              # cartContext (useCart), CartProvider (Preferences-backed device cart)
    ├── hooks/                # useProducts, useCategories, useCatalog, useProductDetail,
    │                         # useRelatedProducts, useContactForm, useAddToCart, useAuthForm, useProfileForm
    ├── lib/                  # formatPrice (AUD), contactRules (mirror of the web rules), tabBase,
    │                         # cart (reducer, totals, stored format), authRules (mirror of the web rules),
    │                         # profileRules (Account form + initials), formatDate (order dates)
    ├── data/                 # categories.tsx (fixed Home rail), studio.ts (studio location),
    │                         # account.ts (sample person + orders for the Account preview)
    ├── components/           # CategoryRail, CategoryChips, ProductCard(+Skeleton), RetryNotice, StoryCard,
    │                         # ContactChannels, ContactForm, StudioMap (Leaflet), PageHeader,
    │                         # ProductGallery, RelatedProducts, PurchaseBar, CartTabBadge,
    │                         # CheckoutSteps, CartLine, CartSummary, SegmentedTabs, ProfileForm, OrderCard
    ├── pages/                # Home, Catalog, ProductDetail, About, Cart, Login, Account (mockups)
    └── theme/variables.css   # Mockup tokens mapped onto Ionic variables
```

This is the Ionic CLI's own `blank` template plus Capacitor's iOS and Android
platforms. Every mobile mockup is implemented (Cart covers the first checkout
step; Login and Account are previews until authentication exists). Unit tests sit beside the code they cover (`*.test.ts`). Unlike `web` and `desktop` (plain
JavaScript), this platform is TypeScript, because Ionic's React starters ship
that way and there is no JavaScript variant of the same template.

`ios/` and `android/` are entirely derived from `capacitor.config.ts` and
`package.json` today — the root `.gitignore` excludes both directories
outright ("Native Capacitor projects are generated from config; regenerate
with `npx cap add`"), so neither is committed. Capacitor 8 resolves its
default plugins through Swift Package Manager, so there is no
`Podfile`/`.xcworkspace` on iOS — build against `App.xcodeproj` directly.
That "derived" premise holds only until something inside either directory is
hand-edited (permissions, manifest entries, icons, signing, deep links) —
the first such edit is the point to start committing the native projects.

---

## 7. The desktop platform (`cluster3-project/desktop`)

```
desktop/
├── .env.example          # Documents every environment variable (no secrets)
├── electron-builder.config.cjs # Installer settings shared by .dmg and .exe
├── scripts/dist.mjs      # `pnpm dist:*`: bakes the config, runs electron-builder
├── app-config.json       # Baked by scripts/dist.mjs (build output, gitignored)
├── release/              # Installers (build output, gitignored)
├── index.html            # Vite entry point for the renderer
├── vite.config.mjs       # Renderer build; pinned dev port, relative asset base
├── tailwind.config.js    # Content globs, plus the lpa palette and fonts
├── postcss.config.js     # Tailwind + autoprefixer
├── resources/            # App icons (icon.png|icns|ico), exported from brand/;
│                         #   electron-builder puts them on both installers
├── tests/
│   ├── env.test.js               # Environment validation
│   ├── packagedConfig.test.js    # Configuration baked into installers
│   ├── describeHealth.test.mjs   # Health envelope → service state
│   ├── apiClient.test.js         # Result envelope for every failure mode
│   ├── loginRules.test.mjs       # Admin sign-in validation
│   ├── barWidths.test.mjs        # Dashboard bar scaling
│   ├── table.test.mjs            # Sorting, paging and search shared by tables
│   ├── userTable.test.mjs        # Users filtering and initials
│   ├── orderTable.test.mjs       # Orders filtering and the recent-orders list
│   ├── catalogRules.test.mjs     # Category and product validation, slugs, counts
│   ├── storeRules.test.mjs       # Settings → Store info validation
│   └── format.test.mjs           # Date and money formats
└── src/
    ├── main/             # The only process with configuration and network access
    │   ├── index.js              # Lifecycle, CSP, BrowserWindow, dev/prod loading
    │   ├── preload.js            # contextBridge surface — named functions only
    │   ├── config/env.js         # Validated, frozen configuration
    │   ├── config/packaged.js    # Bakes and reads a packaged build's config
    │   ├── config/index.js       # Picks the source: baked file or .env
    │   ├── services/apiClient.js # HTTP client returning result envelopes
    │   └── ipc/health.ipc.js     # Registers the api:health channel
    └── renderer/         # React; no Node, no network
        ├── main.jsx              # React root; bundles the @fontsource fonts
        ├── App.jsx               # Sign-in gate, section, session data, save seams
        ├── components/AdminLogin.jsx  # Admin sign-in screen (preview, no auth yet)
        ├── components/AdminLayout.jsx # Sidebar frame shared by every admin screen
        ├── components/Icon.jsx        # The mockups' stroke icons, by name
        ├── components/Dashboard.jsx   # Dashboard screen (preview, sample data)
        ├── components/Users.jsx       # Users screen (preview, sample accounts)
        ├── components/Orders.jsx      # Orders screen (preview, sample orders)
        ├── components/OrderStatusBadge.jsx # Order status pill (Dashboard, Orders)
        ├── components/Catalog.jsx     # Categories and their products (display only)
        ├── components/CatalogForms.jsx # New-category and new-product forms
        ├── components/Settings.jsx    # Settings tabs; System status checks the API live
        ├── components/formParts.jsx   # Field, control classes shared by the forms
        ├── components/tableParts.jsx  # Search, chips, headers, pager for list screens
        ├── data/dashboard.mjs    # Sample figures until the admin API exists
        ├── data/users.mjs        # Sample accounts and the signed-in admin
        ├── data/orders.mjs       # Sample orders (Orders and the Dashboard)
        ├── data/catalog.mjs      # Sample catalog; its typedefs are the DB contract
        ├── data/settings.mjs     # Sample store info, shipping, admins, templates, log
        ├── lib/describeHealth.mjs # Health envelope → state for System status
        ├── lib/loginRules.mjs    # Sign-in rules shared in wording with web/mobile
        ├── lib/barWidths.mjs     # Scales category counts into bar widths
        ├── lib/table.mjs         # Sorting, paging and search for every table
        ├── lib/userTable.mjs     # Users filtering and avatar initials
        ├── lib/orderTable.mjs    # Orders filtering and the newest orders
        ├── lib/catalogRules.mjs  # Catalog validation, slugify, per-category counts
        ├── lib/storeRules.mjs    # Store info validation
        ├── lib/format.mjs        # Date and money formats from the mockups
        └── styles/tailwind.css   # Tailwind source
```

The renderer never learns the API's address. Every call crosses the preload
bridge, which means an admin token added later stays in the main process.

Vite compiles the renderer only: `src/main/` is CommonJS importing nothing
beyond `electron` and Node builtins, so it needs no build step.

Installers come from `pnpm dist:mac` / `pnpm dist:win`. An installed app has
no shell environment and no `.env`, so `scripts/dist.mjs` validates the build
machine's configuration and bakes it into the package as `app-config.json`;
`config/index.js` reads that file when `app.isPackaged` and the `.env`
otherwise. The installer's file name carries the environment it was baked for.

The admin screens follow the desktop mockups in `documentation/Mockup/`. Their
colours come only from the `lpa` palette in `tailwind.config.js`, and the fonts
are bundled with `@fontsource` because the renderer's CSP allows only `'self'`.
The sign-in screen is a preview: a form that passes validation opens the app
with no request, until the API gains an authentication endpoint. The Dashboard,
Users and Orders screens are previews too: they render the sample data in
`data/` because the API has no users, orders or statistics endpoints yet.
Blocking or deleting a user and changing an order's status change `App`'s
in-memory lists only; the Dashboard's recent orders read the same list.
`AdminLayout`'s `SECTIONS` lists every sidebar section; one whose screen is not
built yet stays visible but disabled.

Settings is sample data too, with one exception: System status's REST API row
is live. It calls `window.api.getHealth()` and maps the envelope through
`lib/describeHealth.mjs`, which keeps a 503 (database down → Degraded) apart
from an unreachable API (Down). Store info saves through `saveStoreInfo` in
`App.jsx`, the same `{ saved: false }` seam as the Catalog forms.

The Catalog screen (categories and the products in each) has no mockup and is
display-only until the database exists. Its forms validate with
`lib/catalogRules.mjs` and pass the record to `createCategory` /
`createProduct` in `App.jsx`, which today report `{ saved: false }`. Those two
functions are the integration seam: they become calls to named `window.api`
functions, and `data/catalog.mjs`'s `Category` and `Product` typedefs describe
the rows the tables must hold (`products.categoryId` → `categories.id`).
