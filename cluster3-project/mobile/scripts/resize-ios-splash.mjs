/**
 * Post-processing step for `pnpm assets`: shrinks the iOS splash images that
 * @capacitor/assets writes into ios/App/App/Assets.xcassets/Splash.imageset.
 *
 * The generator writes every scale (@1x, @2x, @3x) at 2732x2732. iOS renders
 * the launch screen under a tight memory budget, and three ~30 MB decoded
 * bitmaps exceed it: the launch screen then shows plain black instead of the
 * splash. Sizing each scale to a 683 pt square keeps the @3x image at 2049 px,
 * which renders reliably; the storyboard's aspect-fill still covers the screen.
 */
import { readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SPLASH_DIR = 'ios/App/App/Assets.xcassets/Splash.imageset';
const POINTS = 683;

/**
 * Resizes every generated splash image to its scale's pixel size.
 *
 * @returns {Promise<void>} Resolves once every image has been rewritten.
 * @throws {Error} If the image set is missing (run `npx cap add ios` first).
 */
async function resizeSplash() {
  const files = (await readdir(SPLASH_DIR)).filter((name) => /^Default@\dx.*\.png$/.test(name));

  for (const name of files) {
    const scale = Number(name.match(/@(\d)x/)[1]);
    const path = join(SPLASH_DIR, name);
    const tmp = `${path}.tmp`;
    await sharp(path).resize(POINTS * scale, POINTS * scale).png().toFile(tmp);
    await rename(tmp, path);
    console.log(`RESIZE ios splash ${name} -> ${POINTS * scale}px`);
  }
}

await resizeSplash();
