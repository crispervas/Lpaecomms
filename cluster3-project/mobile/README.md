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

`ios/` and `android/` are gitignored — they are fully derived from
`capacitor.config.ts` and `package.json`, so a fresh checkout regenerates
them instead of tracking them:

```bash
pnpm install
cp .env.example .env
pnpm build
npx cap add ios
npx cap add android
```

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

## What this is not, yet

This branch is the runnable scaffold only: the template's default screen,
Capacitor wired for both native platforms, and a documented (unused)
`VITE_API_BASE_URL`. No product page, navigation, or API call exists yet —
that arrives in the branch that builds the first real view.
