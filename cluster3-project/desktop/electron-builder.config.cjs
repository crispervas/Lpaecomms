/**
 * @file electron-builder configuration shared by every installer.
 *
 * scripts/dist.mjs loads this object and adds the per-build parts — the target
 * platform and an artifact name carrying the environment — so one file holds
 * what every installer has in common.
 *
 * Only the main process, the compiled renderer and the baked configuration
 * ship. React, Tailwind and the fonts are already bundled into dist/ by Vite,
 * so no development dependency needs to travel with the app.
 */

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.lpaecomms.desktop',
  productName: 'LPA Ecomms Admin',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: ['package.json', 'src/main/**', 'dist/**', 'app-config.json'],
  mac: {
    // One installer for Apple Silicon and Intel Macs alike.
    target: [{ target: 'dmg', arch: ['universal'] }],
    icon: 'resources/icon.icns',
    category: 'public.app-category.business',
    // Ad-hoc signature. Without a Developer ID there is no real signature to
    // apply, but an unsigned arm64 binary is killed on launch; "-" signs it
    // ad hoc so it runs, after the user approves it once in Gatekeeper.
    identity: '-',
    // The hardened runtime only matters for notarization, which needs a
    // Developer ID. Combined with an ad-hoc signature it makes macOS refuse to
    // load Electron's own frameworks, so it stays off until real signing.
    hardenedRuntime: false,
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico',
  },
  nsis: {
    // An assisted installer rather than a silent one-click install, so the
    // user sees where the app goes and can change it.
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
