# Mashup amd WEB Technology

## Comparative: Web 1.0, Web 2.0, Web 3.0, and Web 4.0

| Aspect | Web 1.0 | Web 2.0 | Web 3.0 | Web 4.0 |
|---|---|---|---|---|
| Common name | Static web | Social web | Semantic / decentralized web | Intelligent web |
| Approximate period | 1990-2004 | 2004-present | 2010-present | In development |
| User role | Reader only | Creator and consumer | Data owner and participant | User connected to intelligent systems |
| Content type | Fixed pages | Blogs, social media, videos | Connected data, blockchain, AI | Personalized and intelligent experiences |
| Interaction | Very low | High | High and more automated | Very high, predictive, and real-time |
| Key technology | Basic HTML, links | Social networks, web apps, cloud computing | AI, blockchain, semantic web | Advanced AI, IoT, intelligent assistants |
| Examples | Informational websites, old online encyclopedias | Facebook, YouTube, Wikipedia, Instagram | Cryptocurrencies, NFTs, dApps, AI assistants | Smart homes, connected cars, personalized AI |
| Main advantage | Access to information | Participation and collaboration | Data control and automation | Constant personalization and intelligence |
| Main disadvantage | Little interaction | Dependence on big platforms | Complexity and limited mass adoption | Privacy risks and technological dependence |

## Summary

Web 1.0 was for reading, Web 2.0 is for participating, Web 3.0 seeks decentralization and connected data, and Web 4.0 aims for a more intelligent, predictive, and personalized web.

## What Is a Mashup in Software Development?

A mashup is mixing tools, data, or services from different applications to create a new solution.


## MASHUP 1 — Products for Sale + Location

### 36) Identify mashup content according to organisational requirements

It was identified that LPA needs to show customers the physical location of available products (stores/warehouses), as an organisational requirement to improve the shopping experience and provide greater transparency around product availability and proximity.

### 37) Determine sources of content required for mashup

Content | Source
|---|---|
Product data |	LPA internal database
Interactive map |	Leaflet (open-source JS library for maps)


### 38) Determine and document mashup interface requirements

Interactive map embedded in the catalogue/store page
One marker per product, placed according to latitude/longitude
Clicking a marker shows a popup with the product name, price, and image
Responsive design (the map must adapt to mobile screens)
Acceptable loading time; the map must not block the rest of the page while loading

#### Library specifications

Leaflet.js v1.9+ loaded via CDN or npm
Base tile layer from OpenStreetMap: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
Mandatory OpenStreetMap attribution visible on the map (licence requirement)

#### Data structure

Each product record in the database must include latitude (DECIMAL 9,6) and longitude (DECIMAL 9,6) fields
Data is sent to the frontend as JSON via an internal endpoint, e.g. GET /api/products/locations → [{id, name, price, lat, lng, image_url}, ...]

#### Interface behaviour

Map container with a minimum fixed height of 400px, width 100% of the parent container
Initial zoom level: 10–12, centred on the average coordinates of the products
Custom markers (divIcon) reflecting LPA's logo/brand colour
Marker clustering (Leaflet.markercluster plugin) if more than 20 nearby products exist, to avoid visual overload
Popup via bindPopup() displaying HTML with a thumbnail image (80x80px), product name, and price formatted in AUD
click event on markers for optional analytics (product interest tracking)

#### Responsiveness

Mobile breakpoint (<768px): map height reduces to 300px and zoom controls reposition
map.invalidateSize() must run after layout changes (e.g. opening/closing a side panel) to prevent incorrect rendering

#### Performance

Lazy loading of the Leaflet script, only when the user scrolls to the map section (Intersection Observer)
Target response time for the locations endpoint: < 300ms

### Implementation status

This mashup is live on the Mashups page (`/mashup`), the "Products + Location" card.

**What it consumes.** The browser script fetches `GET /api/v1/products` — the same endpoint the mobile and desktop clients call — and plots one Leaflet marker per product returned.

**Files involved.**

| File | Role |
|---|---|
| `src/public/js/mashup-map.js` | Initialises the Leaflet map, fetches the catalogue, and renders markers/popups |
| `src/views/components/mashupOne.ejs` | Provides the `#mashup-map` container the script renders into |
| `src/models/product.model.js` | Merges the external catalogue with Gold Coast store coordinates |

**Store locations.** The external demo feed carries no coordinates, so store locations are merged in server-side from a fixed Gold Coast table (`STORE_LOCATIONS` in `product.model.js`) rather than invented in the browser.

**Deliberately not built.** Marker clustering (`Leaflet.markercluster`) and Intersection-Observer lazy loading of the Leaflet script — both listed under Interface behaviour/Performance above — were left out on purpose: five products cannot overlap enough for clustering to matter, and the script tag already uses `defer`, which keeps Leaflet off the critical rendering path without the added complexity of an observer.

## MASHUP 2 — Products + Currency Converter

### 36) Identify mashup content according to organisational requirements

It was identified that LPA will have international customers, so it is required to display product prices converted into the most common transaction currencies (e.g. GBP, USD, AUD), as an organisational requirement to make purchasing decisions easier for overseas customers.

### 37) Determine sources of content required for mashup

Content | Source
|---|---|
Base product price | LPA internal database
Real-time exchange rates   |	API Ninjas – Currency Convert (api.api-ninjas.com/v1/convertcurrency)

### 38) Determine and document mashup 

#### interface requirements

Currency dropdown selector displayed next to the product price
The price updates dynamically when the selected currency changes, without reloading the page
Loading indicator while waiting for the API response
Error handling: if the API does not respond, display the price in the original currency with a warning message
The API key (X-Api-Key) must be kept in an environment variable, never exposed in public code

#### HTTP request specification

Endpoint: GET https://api.api-ninjas.com/v1/convertcurrency?have={BASE}&want={TARGET}&amount={PRICE}
Required header: X-Api-Key: {API_KEY} (stored in an environment variable process.env.NINJA_API_KEY, never hardcoded)
Expected response (JSON): { "new_currency": "AUD", "new_amount": 92.34, ... }
Status code handling: 200 (success) → update UI; 401/403 (invalid key) → internal error log, no details shown to the user; 429 (rate limit exceeded) → fall back to cached value; timeout (>5s) → show original price with a warning icon

#### Interface component

< select > limited to currencies supported by the store (AUD, USD, GBP, EUR — validated against a whitelist, not every currency the API supports)
300ms debounce on the onChange event to prevent excessive calls if the user switches options quickly
Localised number formatting per currency (Intl.NumberFormat), e.g. $92.34 AUD vs £49.00 GBP

#### Caching

Exchange rates are stored in localStorage/sessionStorage (or a temporary backend table) with a timestamp
Cache TTL: 1 hour, to reduce calls against the API Ninjas free plan
If a valid cached rate exists, it is used instead of calling the API

#### Security

The API call must be made from the backend (internal proxy), not directly from the browser, to avoid exposing the X-Api-Key in client-side code
Proposed internal endpoint: GET /api/convert?have=GBP&want=AUD&amount=5000

### Implementation status

This mashup is live on the Mashups page (`/mashup`), the "Products + Currency Converter" card.

**What it consumes.** The browser script calls two of this application's own REST endpoints — the same contract the mobile and desktop clients use: `GET /api/v1/products` for the catalogue and `GET /api/v1/convert?have=&want=&amount=` for the exchange rate.

**Files involved.**

| File | Role |
|---|---|
| `src/public/js/mashup-currency.js` | Populates the product and currency selectors, requests conversions, and renders the result |
| `src/views/components/mashupTwo.ejs` | Provides the `#mashup-product`, `#mashup-currency`, `#mashup-base-price`, `#mashup-converted-price`, and `#mashup-convert-status` elements the script binds to |
| `src/controllers/currency.controller.js` / `src/models/currency.model.js` | Server-side proxy to API Ninjas — keeps `NINJA_API_KEY` out of the browser entirely, since the client never calls the provider directly |

**Debounce.** Changing either selector schedules a 300ms timer (`DEBOUNCE_MS`) before the conversion request fires; a second change within that window cancels the pending timer instead of adding a second in-flight request, so rapid switching between currencies settles into one call.

**Caching.** The one-hour rate cache lives in the currency model's process memory (`CurrencyModel.rateCache`), not in `localStorage`: rates are shared across every visitor hitting the same server instance rather than duplicated per browser, and nothing about exchange rates needs to survive a page reload on the client.

**AUD short-circuit.** Selecting AUD as the display currency never calls `/api/v1/convert`: the script recognises `target === BASE_CURRENCY` and renders the catalogue price directly, since converting a currency into itself has a known answer that does not need a round trip.

**Failure fallback.** If `/api/v1/products` fails, the product selector shows "Products unavailable" and the status line reports the catalogue is down. If `/api/v1/convert` fails or answers a non-2xx status — including the 502 the API Ninjas free plan currently returns for every non-identity pair — the converted field falls back to the AUD price with the status "Live rates are unavailable — showing the price in AUD.", never a blank field.

**Security.** Product names come from the same untrusted third-party feed as mashup 1. The script inserts them with `new Option(product.name, ...)`, which sets `textContent`, not `innerHTML` — a name containing markup is rendered as inert text in the `<option>`, the same defence `mashup-map.js` uses for its popups.

## MASHUP 3 — Secure Password Checker

### 36) Identify mashup content according to organisational requirements

It was identified that, during the registration process, users sometimes create weak passwords or ones that have already been exposed in previous data breaches. As an organisational security requirement, LPA needs to warn users in real time if their password has been compromised, promoting the use of stronger passwords.

### 37) Determine sources of content required for mashup

Content | Source
|---|---|
Registration form |	LPA internal system
Password security status	| Have I Been Pwned – Pwned Passwords API GET https://api.pwnedpasswords.com/range/{first_5_characters_of_SHA1_hash}

### 38) Determine and document mashup 

#### interface requirements

Password input field on the registration form
Password strength indicator (visual, e.g. colour bar)
Warning message if the password appears in the breach database
Recommendation/suggestion to create a stronger password if rejected
Privacy requirement: never send the full password to the API; only the first 5 characters of the SHA-1 hash (k-anonymity)

#### Technical flow (k-anonymity)

On blur (onBlur) or after a 500ms debounce on onKeyUp, the password's SHA-1 hash is computed using crypto.subtle.digest('SHA-1', ...) (native browser Web Crypto API)
The hash is converted to uppercase hexadecimal (format required by the API)
Only the first 5 characters of the hash are sent: GET https://api.pwnedpasswords.com/range/{first5}
The API returns a list of hash suffixes (plain text, SUFFIX:COUNT format) sharing that prefix
The client locally checks whether the remaining suffix of the user's password hash appears in the returned list
If a match is found → password is compromised; if not → password not found in known breaches

#### Interface components

< input type="password" > field with autocomplete="new-password" attribute
Strength bar with at least 4 levels (weak/fair/strong/very strong), calculated locally using rules: minimum length 8, use of upper/lowercase letters, numbers, symbols
Status message below the field:
Verification in progress: "Checking password security..."
Compromised password: "This password has appeared in N data breaches. Please choose another."
Secure password: green check "This password was not found in known breaches"
The form's submit button must remain disabled while verification is in progress, or if the password has been flagged as compromised

#### Privacy and security requirements

The Have I Been Pwned Pwned Passwords public endpoint does not require an API key
Never log the plain-text password, not even in the development console
Request timeout: 3 seconds; on failure, allow registration to continue with a generic warning instead of blocking the user


## Implemented Web Mashups — Company Location Map and Intro Video

The two mashups below are already implemented in the web layer (`cluster3-project/web`). Unlike the design specifications above, this section documents what is actually built and where, so it can be traced directly to the source code.

### A) Company location map (Contact page)

**Purpose.** Show visitors the physical location of Lpaecomms on an interactive map, so a customer can see, pan, and zoom where the company is instead of reading an address as plain text.

**What it combines (the mashup).** Lpaecomms' own Contact page + Leaflet (an open-source mapping library) + OpenStreetMap map data (a crowd-sourced, community-maintained data set). None of these is ours end to end; the page is the new product created by mixing them.

| Element | Detail |
|---|---|
| Page | Contact page (`/contact`), right column of a responsive two-column grid |
| Library | Leaflet 1.9.4, loaded from the unpkg CDN (CSS + JS) |
| Map data / tiles | OpenStreetMap raster tiles `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (max zoom 19) |
| Attribution | OpenStreetMap credit shown on the map, as required by their usage policy |
| Marker | A single marker at the company coordinates, initial zoom 17, with a popup opened by default ("Lpaecomms — Come and visit us here") |

**How the integration is wired.**

- The map assets are injected only on the Contact page: [contact.controller.js](../cluster3-project/web/src/controllers/contact.controller.js) passes Leaflet's CSS/JS and the init script through the `styles`/`scripts` locals of the base layout. Other pages never download Leaflet.
- The view provides an empty container the map renders into — `#contact-map` with an explicit height, plus `isolate`/`z-0` so Leaflet's internal z-indexes cannot cover the fixed header, and `role="region"` + `aria-label` for assistive technology. See [contact.ejs](../cluster3-project/web/src/views/pages/contact.ejs).
- The map is initialised by [contact-map.js](../cluster3-project/web/src/public/js/contact-map.js), which runs after Leaflet loads (load order matters: Leaflet first, then the init script). The script is defensive: if the container is absent or the global `L` is undefined it does nothing, so including it on other pages is harmless.

### B) Intro video (About page)

**Purpose.** Explain what a mashup is using a short embedded video, giving richer media than text alone on the About page.

**What it combines (the mashup).** Lpaecomms' own About page + YouTube's video hosting and player, embedded straight into the page. YouTube handles storage, streaming, and playback; we only host the surrounding page.

| Element | Detail |
|---|---|
| Page | About page (`/about`), under the "What does Mashup mean?" heading |
| Embed | `<iframe>` pointing at YouTube's embed URL `https://www.youtube.com/embed/ZRcP2CZ8DS8` |
| Responsive layout | Tailwind `aspect-video` wrapper (locks the 16:9 ratio at any width) with `w-full`; the iframe fills it with `h-full w-full` |
| Performance | `loading="lazy"` defers loading the player until it is near the viewport |
| Privacy / security | `referrerpolicy="strict-origin-when-cross-origin"`, a scoped `allow` feature policy, and `allowfullscreen` |

**How the integration is wired.** This is a pure client-side embed — no API key, no server call, no build step. The [about.controller.js](../cluster3-project/web/src/controllers/about.controller.js) only renders a static template; the iframe lives directly in [about.ejs](../cluster3-project/web/src/views/pages/about.ejs).

### C) Summary — how these relate to Web 2.0

Both features are textbook Web 2.0 mashups: each takes services and data from other providers and remixes them into our own page to make something richer than any part on its own. Concretely, they show these Web 2.0 characteristics:

| Web 2.0 trait | How the map shows it | How the video shows it |
|---|---|---|
| Content aggregation / remixing | Leaflet + OpenStreetMap data pulled into our page | YouTube player embedded into our page |
| Rich, interactive experience | Pan, zoom, and click the marker without reloading | Play, pause, and full-screen the video inline |
| Open, embeddable services | Open-source library + open tile service | Public embed endpoint, no key needed |
| User-generated / community content | OpenStreetMap tiles are crowd-sourced by contributors | YouTube is a user-generated video platform |
| Browser as the platform | The map runs entirely in the browser | The player runs entirely in the browser |

In short: Web 1.0 would have shown a static address and a "watch it here" link. Web 2.0 lets us **combine third-party services with our own site into one interactive experience** — which is exactly what the company-location map and the embedded intro video do.

