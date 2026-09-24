# Lpaecomms Mobile

Ionic + React storefront client for the Lpaecomms store, packaged with
Capacitor for iOS and Android. It consumes the REST API served by
`cluster3-project/web` and shares no UI code with the web or desktop
platforms — the API is the only contract between them.

Unlike `web` and `desktop` (plain JavaScript), this platform is TypeScript:
the Ionic CLI's React starters only ship that way, and hand-rolling the
Capacitor/iOS/Android wiring to stay JavaScript-only would mean
reimplementing what the official CLI already gets right.

## Requirements

- Node.js >= 20
- pnpm 10.33.0
- Xcode with a configured iOS Simulator, to run the iOS build
- Android Studio with an installed SDK, to run the Android build
- The web platform running, for the API (`cluster3-project/web`)

## Setup

`ios/` and `android/` are gitignored — nothing in them is hand-edited yet, so
a fresh checkout regenerates them from `capacitor.config.ts` and
`package.json` instead of tracking them (see the caveat at the bottom of
this section):

```bash
pnpm install
cp .env.example .env
pnpm build
npx cap add ios

# Android's platform add runs a Gradle sync, which needs these three set —
# Gradle's own error text will not tell you which one is missing:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
npx cap add android
```

The moment anything in `ios/` or `android/` is hand-edited — permissions
in `Info.plist`, entries in `AndroidManifest.xml`, app icons, a signing
config, a deep-link scheme — regenerating destroys that edit. That is the
point to revisit this gitignore policy and start committing the native
projects, not to work around it.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server, in the browser |
| `pnpm build` | Compile the web assets into `dist/` |
| `pnpm test.unit` | Run the Vitest unit tests |
| `pnpm test.e2e` | Run the Cypress end-to-end tests (needs `pnpm dev` running) |
| `npx cap sync` | Copy the latest web build into both native projects |
| `npx cap open ios` | Open the iOS project in Xcode |
| `npx cap open android` | Open the Android project in Android Studio |

Android builds need `JAVA_HOME` pointed at a JDK 17+ (Android Studio's
bundled JBR works) and `ANDROID_HOME`/`ANDROID_SDK_ROOT` pointed at the SDK —
a fresh shell has neither set. Capacitor 8 resolves its default plugins
through Swift Package Manager, so there is no `Podfile`/`.xcworkspace` on
iOS — build or open `ios/App/App.xcodeproj` directly.

## Running against the local API

The Home view's "Trending now" grid calls `GET /api/v1/products`. Start the
web platform (`pnpm dev` in `cluster3-project/web`) before `pnpm dev` here,
and make sure `.env` sets `VITE_API_BASE_URL=http://localhost:3000/api/v1`.
With the API down the grid shows an error with a Retry button; the rest of
the page still renders.

## Current scope

The app shell is an `IonTabs` bar with Home, Catalog, Cart and Login. Home
and Catalog implement their mockups; Cart and Login are "coming soon"
placeholders until their own views are built. Catalog reads
`GET /api/v1/categories` and `GET /api/v1/catalog` — restart the web server
after pulling so it serves them. Categories on Home are still a fixed
client-side list; the Catalog's chips come from the API.

About & Contact (from Home's "Our story" card) sends its form to
`POST /api/v1/contact` and embeds a Leaflet map with OpenStreetMap tiles,
which need a connection; offline the studio card's "Open in Maps" link still
works. Its copy follows the web's About and Contact pages rather than the
mockup (no team section, no invented history).

Product pages open from Home and Catalog inside the same tab
(`/home/product/:id`, `/catalog/product/:id`), so back returns to where the
user came from. They read `GET /api/v1/products/:id`, list related products
through `GET /api/v1/catalog`, and add to the device cart.

The cart lives on the device, stored with `@capacitor/preferences` (native
storage on iOS and Android, `localStorage` in the browser); run `npx cap sync`
after `pnpm install` so the native projects get the plugin. Products are added
from their page (with a quantity) or from a card's cart button, and the Cart
tab covers the mockup's first checkout step. Shipping, Payment and placing an
order need a signed-in user and a server-side order, so they come after Login.
