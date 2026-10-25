/**
 * @file Builds a desktop installer for one platform.
 *
 * Run through `pnpm dist:mac` or `pnpm dist:win`, after Vite has compiled the
 * renderer. It resolves the build's environment, validates it and writes it
 * into app-config.json (see src/main/config/packaged.js), then hands
 * electron-builder the shared configuration plus this build's target.
 *
 * The environment comes from the build machine, never from source, through
 * the same rule as development (src/main/config/envFile.js):
 * - `.env.<NODE_ENV>` when it exists (NODE_ENV defaults to development);
 * - otherwise `.env`.
 * Variables already set in the shell win over either file, so CI can supply
 * everything as secrets. `NODE_ENV=production pnpm dist:mac` therefore builds
 * a production installer from `.env.production`.
 *
 * Usage: node scripts/dist.mjs --mac | --win
 */

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { Platform, build } from 'electron-builder';

const require = createRequire(import.meta.url);
const { PACKAGED_CONFIG_FILE, bakeConfigSource } = require('../src/main/config/packaged.js');
const { resolveEnvFile } = require('../src/main/config/envFile.js');
const sharedConfig = require('../electron-builder.config.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Platform flags this script accepts. */
const PLATFORMS = { '--mac': Platform.MAC, '--win': Platform.WINDOWS };

/**
 * Load the environment file for this build into process.env.
 *
 * @returns {string|null} The file loaded, for the build log; null when the
 *   shell supplies everything.
 */
function loadEnvironmentFile() {
  const file = resolveEnvFile(ROOT, process.env.NODE_ENV);
  // dotenv never overrides a variable the shell already set.
  if (file) dotenv.config({ path: file, quiet: true });
  return file;
}

const flag = process.argv.find((argument) => argument in PLATFORMS);
if (!flag) {
  console.error('Usage: node scripts/dist.mjs --mac | --win');
  process.exit(1);
}

const envFile = loadEnvironmentFile();
const { values, nodeEnv } = bakeConfigSource(process.env);
writeFileSync(path.join(ROOT, PACKAGED_CONFIG_FILE), `${JSON.stringify(values, null, 2)}\n`);
const source = envFile ? path.relative(ROOT, envFile) : 'the shell environment';
console.log(`Baked ${nodeEnv} configuration from ${source}: API ${values.API_BASE_URL}`);

const artifacts = await build({
  projectDir: ROOT,
  targets: PLATFORMS[flag].createTarget(),
  config: {
    ...sharedConfig,
    // The environment is in the name so a staging installer is never mistaken
    // for a production one.
    artifactName: `LPA-Ecomms-Admin-\${version}-${nodeEnv}-\${arch}.\${ext}`,
  },
});

for (const artifact of artifacts) console.log(`Built ${path.relative(ROOT, artifact)}`);
