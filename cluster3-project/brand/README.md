# Lpaecomms brand

The single source of the LPA logo. Web, mobile and desktop share no UI code, so
each platform keeps its own copy of the logo in the format its toolchain
expects — and every one of those copies is generated from here.

The logo is the "LPA" wordmark in Space Grotesk Bold, white on `--lpa-ink`
(`#14161a`), over a rounded `--lpa-accent` (`#2f5efb`) bar.

## Commands

```bash
pnpm install
pnpm build     # outline + export
```

| Command | What it does |
| --- | --- |
| `pnpm outline` | Redraw the SVG masters in `svg/` from `scripts/outline.mjs` |
| `pnpm export` | Rasterise the masters into every platform |
| `pnpm build` | Both, in order |

## Masters (`svg/`)

Generated, but committed so the logo can be reviewed without running
anything. All text is converted to paths, so they render without the fonts.

| Master | Shape | Used for |
| --- | --- | --- |
| `app-icon.svg` | Full-bleed square | iOS, legacy Android, web touch icon |
| `app-icon-foreground.svg` / `app-icon-background.svg` | Mark / plain ink | Android adaptive icon |
| `favicon.svg` | Rounded square, larger mark | Browser tabs (web, mobile browser build) |
| `desktop-icon.svg` | Rounded body on Apple's 824/1024 grid | Desktop app icon |
| `splash.svg` | Mark plus author credit | Mobile splash screen |

To change the logo, edit `scripts/outline.mjs` — colours, sizes and the credit
text are constants at its top — rather than the SVGs, which the next
`pnpm outline` overwrites.

## Outputs

| Platform | Files | Next step |
| --- | --- | --- |
| mobile | `assets/*.png`, `public/favicon.png` | `pnpm assets` in `mobile/` regenerates the native icons and splash |
| web | `src/public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | Linked from `layouts/base.ejs`; nothing to run |
| desktop | `resources/icon.png`, `icon.icns`, `icon.ico` | Not wired yet — see below |

### Desktop

The Electron code lives on `feature/desktop` and is not merged into
`development` yet, so the icons are ready but nothing references them. Once
it lands, point Electron at them:

- `new BrowserWindow({ icon: path.join(__dirname, '../../resources/icon.png') })`
  for the window and taskbar icon on Windows and Linux.
- `app.dock.setIcon(...)` on macOS while running `pnpm dev`, since an unpackaged
  app shows Electron's own icon in the Dock.
- The packager's icon setting (`icon.icns` for macOS, `icon.ico` for Windows)
  for the installed app. `resources/` is used instead of the conventional
  `build/` because the root `.gitignore` excludes every `build/` folder.
