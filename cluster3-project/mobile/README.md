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
cp .env.development.example .env.development
pnpm build
npx cap add ios

# Android's platform add runs a Gradle sync, which needs these three set —
# Gradle's own error text will not tell you which one is missing:
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
npx cap add android

# App icons and splash screens are generated from assets/, not stored natively:
pnpm assets
```

The moment anything in `ios/` or `android/` is hand-edited — permissions
in `Info.plist`, entries in `AndroidManifest.xml`, a signing config, a deep-link scheme — regenerating destroys that edit. That is the
point to revisit this gitignore policy and start committing the native
projects, not to work around it. App icons and splash screens are the
exception: they are regenerated from the committed sources in `assets/`
(see below), so they survive a platform re-add.

### App icon and splash screen

`assets/` holds the sources `@capacitor/assets` reads: `icon-only.png`
(iOS and legacy Android), `icon-foreground.png` + `icon-background.png`
(Android adaptive icon) and `splash.png`/`splash-dark.png`. They are exported
from `cluster3-project/brand`, the single source of the LPA logo shared with
web and desktop — change the logo there, run `pnpm build` in `brand/`, then run
`pnpm assets` here. `public/favicon.png` comes from the same export.

`pnpm assets` then runs `scripts/resize-ios-splash.mjs`: the generator writes
every iOS splash scale at 2732x2732, which exceeds the launch screen's memory
budget and leaves it plain black. The script sizes each scale to a 683 pt
square instead.

On its own the launch screen disappears as soon as the web view paints, which
on a real device is too quick to see. `@capacitor/splash-screen` keeps the same
image up for 2 s and fades it out; its settings live under
`plugins.SplashScreen` in `capacitor.config.ts`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server, in the browser |
| `pnpm build` | Compile the web assets into `dist/` (production mode: `.env.production`) |
| `pnpm build:staging` | The same, in staging mode (`.env.staging`) |
| `pnpm test.unit` | Run the Vitest unit tests |
| `pnpm test.e2e` | Run the Cypress end-to-end tests (needs `pnpm dev` running) |
| `pnpm assets` | Regenerate the iOS/Android icons and splash screens from `assets/` |
| `npx cap sync` | Copy the latest web build into both native projects |
| `npx cap open ios` | Open the iOS project in Xcode |
| `npx cap open android` | Open the Android project in Android Studio |

Android builds need `JAVA_HOME` pointed at **JDK 21** (`brew install
openjdk@21`): Capacitor 8 compiles for Java 21, and the Gradle 8.14 wrapper
fails on anything newer — Android Studio's bundled JBR is now Java 25 and
breaks with "Unsupported class file major version 69". They also need
`ANDROID_HOME`/`ANDROID_SDK_ROOT` pointed at the SDK — a fresh shell has
neither set.

To run on a phone, enable USB debugging, connect it, then `npx cap run
android`. `adb reverse tcp:3000 tcp:3000` lets the app reach the local API at
`http://localhost:3000`; it resets whenever the cable is unplugged.

Capacitor 8 resolves its default plugins through Swift Package Manager, so there is no `Podfile`/`.xcworkspace` on
iOS — build or open `ios/App/App.xcodeproj` directly.

## Environments

Each environment has its own file, like the web and the desktop. Here Vite
does the choosing, by **mode**: it reads `.env` and then `.env.<mode>`, the
second winning, and bakes every `VITE_` variable into the bundle.

| Command | Mode | File read over `.env` | Template |
| --- | --- | --- | --- |
| `pnpm dev` | development | `.env.development` | `.env.development.example` |
| `pnpm build:staging` | staging | `.env.staging` | `.env.staging.example` |
| `pnpm build` | production | `.env.production` | `.env.production.example` |

`npx cap sync` copies whatever `dist/` holds, so the app on a phone talks to
the API of the last build: `pnpm build` then `npx cap sync` for production.
To test a phone against your local API instead, build without a
`.env.production` (or with it pointing at your machine), since `pnpm build`
always runs in production mode. Variables set in the shell win over the files.

## Running against the local API

The Home view's "Trending now" grid calls `GET /api/v1/products`. Start the
web platform (`pnpm dev` in `cluster3-project/web`) before `pnpm dev` here,
and make sure `.env.development` (or `.env`) sets
`VITE_API_BASE_URL=http://localhost:3000/api/v1`.
With the API down the grid shows an error with a Retry button; the rest of
the page still renders.

## Current scope

The app shell is an `IonTabs` bar with Home, Catalog, Cart and Login; every
view implements its mockup. Catalog reads
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
order need a signed-in user and a server-side order, so they come with
authentication.

Login is a preview: Log in and Sign up validate with the web's rules and,
when valid, open the Account view (`/login/account`, inside the Login tab).
Account follows its mockup with a sample person and order history from
`src/data/account.ts`, labelled as a preview; Save changes validates and says
nothing is saved, and Sign out returns to the form. Real authentication, the
profile and orders APIs and the checkout come together later.
