/**
 * Exports the logo masters in brand/svg/ to the files each platform consumes.
 *
 * The platforms share no UI code, so each one receives its own copy of the
 * logo in the format its toolchain expects, and commits it:
 *
 * - mobile:  assets/ (the sources `pnpm assets` turns into native icons and
 *            splash screens) and public/favicon.png (the browser build).
 * - web:     src/public/ favicon.svg, favicon.ico and apple-touch-icon.png.
 * - desktop: resources/ icon.png, icon.icns (macOS) and icon.ico (Windows).
 *
 * Run `pnpm export` after changing a master; `pnpm build` redraws them first.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const PROJECT = new URL('../../', import.meta.url);
const master = (name) => new URL(`svg/${name}`, new URL('../', import.meta.url));

/**
 * Rasterises an SVG master to a square PNG.
 *
 * @param {string} name - Master file name in brand/svg/.
 * @param {number} size - Output width and height in pixels.
 * @param {{opaque?: boolean}} [options] - `opaque` drops the alpha channel,
 *   which the iOS launch screen and App Store icons require.
 * @returns {Promise<Buffer>} The PNG bytes.
 */
async function png(name, size, { opaque = false } = {}) {
  const source = await readFile(master(name));
  // The masters are 1024 or 2732 units wide; rendering at a density that
  // lands on the target size avoids resampling a small raster upwards.
  const width = Number(source.toString().match(/width="(\d+)"/)[1]);
  let image = sharp(source, { density: Math.max(72, (72 * size) / width) }).resize(size, size);
  if (opaque) image = image.flatten({ background: '#14161a' });
  return image.png().toBuffer();
}

/**
 * Packs PNG images into a Windows .ico file. Every entry is stored as PNG,
 * which Windows Vista and later read natively.
 *
 * @param {{size: number, data: Buffer}[]} images - One PNG per size, 256 px at most.
 * @returns {Buffer} The .ico file bytes.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // Type 1: icon.
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 encodes 256.
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // Colour planes.
    entry.writeUInt16LE(32, 6); // Bits per pixel.
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

/**
 * Packs PNG images into a macOS .icns file.
 *
 * @param {{type: string, data: Buffer}[]} chunks - PNGs keyed by their
 *   four-character ICNS type (ic07 = 128 px ... ic10 = 1024 px).
 * @returns {Buffer} The .icns file bytes.
 */
function icns(chunks) {
  const body = chunks.map(({ type, data }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([head, data]);
  });
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(8 + body.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  return Buffer.concat([head, ...body]);
}

/**
 * Writes a file under cluster3-project/, creating its folder if needed.
 *
 * @param {string} path - Path relative to cluster3-project/.
 * @param {Buffer|string} data - File contents.
 * @returns {Promise<void>}
 */
async function emit(path, data) {
  const target = new URL(path, PROJECT);
  await mkdir(new URL('./', target), { recursive: true });
  await writeFile(target, data);
  console.log(`WRITE ${path}`);
}

// Mobile — @capacitor/assets reads these fixed names and sizes.
await emit('mobile/assets/icon-only.png', await png('app-icon.svg', 1024, { opaque: true }));
await emit('mobile/assets/icon-foreground.png', await png('app-icon-foreground.svg', 1024));
await emit('mobile/assets/icon-background.png', await png('app-icon-background.svg', 1024, { opaque: true }));
const splash = await png('splash.svg', 2732, { opaque: true });
await emit('mobile/assets/splash.png', splash);
await emit('mobile/assets/splash-dark.png', splash);
await emit('mobile/public/favicon.png', await png('favicon.svg', 64));

// Web — modern browsers take the SVG; the .ico covers the implicit
// /favicon.ico request, and iOS home-screen bookmarks use the touch icon.
await copyFile(master('favicon.svg'), new URL('web/src/public/favicon.svg', PROJECT));
console.log('WRITE web/src/public/favicon.svg');
await emit(
  'web/src/public/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png('favicon.svg', size) })))),
);
await emit('web/src/public/apple-touch-icon.png', await png('app-icon.svg', 180, { opaque: true }));

// Desktop — electron-builder and BrowserWindow accept these three formats.
await emit('desktop/resources/icon.png', await png('desktop-icon.svg', 1024));
await emit(
  'desktop/resources/icon.ico',
  ico(await Promise.all([16, 24, 32, 48, 64, 128, 256].map(async (size) => ({ size, data: await png('desktop-icon.svg', size) })))),
);
const icnsTypes = { icp4: 16, icp5: 32, icp6: 64, ic07: 128, ic08: 256, ic09: 512, ic10: 1024 };
await emit(
  'desktop/resources/icon.icns',
  icns(await Promise.all(Object.entries(icnsTypes).map(async ([type, size]) => ({ type, data: await png('desktop-icon.svg', size) })))),
);
