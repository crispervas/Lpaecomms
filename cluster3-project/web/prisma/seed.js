/**
 * @file Database seed.
 *
 * Fills a fresh development/staging database with the reference data the app
 * cannot run without (roles, genders, document types), a technology
 * peripherals catalogue so the storefront and the mobile app have something
 * to show, and one administrator. Idempotent: every write is an upsert on a
 * unique code/email or a deactivation of a legacy demo row, so running it
 * twice changes nothing. Credentials come from the environment.
 */

import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

expand(dotenv.config({ quiet: true }));

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/** Audit block for rows the seed writes: no user, a system role. */
const created = { user: null, role: 'SYSTEM', server: new Date().toISOString(), source: 'seed' };

const ROLES = [
  { code: 'ADMIN', name: 'Administrator', description: 'Manages the store.' },
  { code: 'CUSTOMER', name: 'Customer', description: 'Buys from the store.' },
];
const GENDERS = [
  { code: 'FEMALE', name: 'Female' },
  { code: 'MALE', name: 'Male' },
  { code: 'OTHER', name: 'Other' },
  { code: 'UNDISCLOSED', name: 'Prefer not to say' },
];
const DOCUMENT_TYPES = [
  { code: 'PASSPORT', name: 'Passport' },
  { code: 'DRIVER_LICENCE', name: "Driver's licence" },
  { code: 'NATIONAL_ID', name: 'National ID' },
];

/**
 * Stable placeholder image: picsum serves the same image for the same seed.
 *
 * @param {string} seed - Image seed.
 * @returns {string} Image URL.
 */
const image = (seed) => `https://picsum.photos/seed/lpa-${seed}/640/640`;

/**
 * Demo catalogue: technology peripherals only. Each category lists its
 * products as [name, price in AUD, stock, description].
 */
const CATALOGUE = {
  keyboards: {
    name: 'Keyboards',
    description: 'Mechanical, wireless and compact keyboards for work and play.',
    products: [
      ['Mechanical Keyboard TKL', 149.0, 25, 'Tenkeyless mechanical keyboard with hot-swappable brown switches and PBT keycaps.'],
      ['Wireless Slim Keyboard', 89.0, 40, 'Low-profile Bluetooth keyboard that pairs with up to three devices.'],
      ['Compact 65% Keyboard', 129.0, 18, 'Space-saving 65% layout with arrow keys, RGB backlight and USB-C.'],
      ['Ergonomic Split Keyboard', 219.0, 10, 'Split, tented layout that keeps wrists straight through long sessions.'],
      ['Numeric Keypad', 39.0, 35, 'Wireless numeric keypad for spreadsheets on compact keyboards.'],
    ],
  },
  mice: {
    name: 'Mice',
    description: 'Precise mice and trackpads for every grip and desk.',
    products: [
      ['Wireless Ergonomic Mouse', 79.0, 45, 'Contoured right-hand mouse with silent clicks and a 70-day battery.'],
      ['Gaming Mouse 26K DPI', 119.0, 22, 'Lightweight 63 g gaming mouse with a 26,000 DPI optical sensor.'],
      ['Vertical Mouse', 69.0, 20, 'Vertical grip that reduces forearm twist for all-day use.'],
      ['Travel Mouse', 35.0, 60, 'Pocket-sized Bluetooth mouse with a USB-C rechargeable battery.'],
      ['Precision Trackpad', 149.0, 12, 'Glass multi-touch trackpad with gesture support.'],
    ],
  },
  'audio-headsets': {
    name: 'Headsets & Audio',
    description: 'Headsets, earbuds and speakers for calls, music and gaming.',
    products: [
      ['Noise-Cancelling Headset', 249.0, 15, 'Over-ear wireless headset with active noise cancellation and a boom mic.'],
      ['USB Office Headset', 79.0, 30, 'Lightweight USB-A/C headset certified for video-call apps.'],
      ['Gaming Headset 7.1', 139.0, 20, 'Virtual 7.1 surround headset with a detachable microphone.'],
      ['Wireless Earbuds', 129.0, 35, 'True wireless earbuds with transparency mode and a charging case.'],
      ['Desktop Speakers 2.0', 99.0, 16, 'Pair of bookshelf speakers with Bluetooth and optical input.'],
    ],
  },
  monitors: {
    name: 'Monitors',
    description: 'Displays for productivity, design and gaming.',
    products: [
      ['27" 4K IPS Monitor', 549.0, 8, '27-inch 4K IPS panel with 99% sRGB and USB-C 65 W power delivery.'],
      ['24" Full HD Monitor', 189.0, 20, '24-inch 1080p IPS monitor with thin bezels and VESA mount.'],
      ['32" Curved Gaming Monitor', 499.0, 6, '32-inch 1440p curved panel at 165 Hz with adaptive sync.'],
      ['Portable USB-C Monitor', 259.0, 14, '15.6-inch portable display powered by a single USB-C cable.'],
      ['34" Ultrawide Monitor', 699.0, 5, '34-inch 3440x1440 ultrawide for side-by-side windows.'],
    ],
  },
  'webcams-microphones': {
    name: 'Webcams & Microphones',
    description: 'Look and sound sharp on every video call and stream.',
    products: [
      ['4K Webcam', 199.0, 18, '4K webcam with autofocus, HDR and a privacy shutter.'],
      ['1080p Webcam', 69.0, 40, 'Full HD webcam with dual stereo microphones.'],
      ['USB Condenser Microphone', 149.0, 15, 'Cardioid USB microphone with a gain knob and headphone monitoring.'],
      ['Ring Light 10"', 45.0, 30, 'Dimmable 10-inch ring light with three colour temperatures.'],
      ['Clip-On Lavalier Mic', 29.0, 50, 'Wired clip-on microphone for laptops and phones.'],
    ],
  },
  'storage-memory': {
    name: 'Storage & Memory',
    description: 'External drives, SSDs and memory cards.',
    products: [
      ['Portable SSD 1TB', 159.0, 30, 'USB-C portable SSD with read speeds up to 1,050 MB/s.'],
      ['External HDD 4TB', 169.0, 20, '4 TB external hard drive for backups and media libraries.'],
      ['USB-C Flash Drive 128GB', 29.0, 80, 'Dual USB-C/USB-A flash drive with a metal casing.'],
      ['microSD Card 256GB', 49.0, 60, 'A2 V30 microSD card for cameras, drones and handhelds.'],
      ['NVMe SSD Enclosure', 49.0, 25, 'Tool-free USB 3.2 enclosure for M.2 NVMe drives.'],
    ],
  },
  'hubs-docks': {
    name: 'Hubs & Docks',
    description: 'Connect every peripheral through a single port.',
    products: [
      ['USB-C 7-in-1 Hub', 69.0, 40, 'HDMI 4K, three USB-A, SD/microSD and 100 W pass-through charging.'],
      ['Thunderbolt Dock', 349.0, 8, 'Dual-display dock with 2.5 GbE, 96 W charging and ten ports.'],
      ['Powered USB 3.0 Hub', 45.0, 30, 'Seven-port powered hub with individual on/off switches.'],
      ['KVM Switch', 89.0, 12, 'Share one keyboard, mouse and monitor between two computers.'],
      ['USB-C to Ethernet Adapter', 25.0, 55, 'Gigabit Ethernet adapter for laptops without a wired port.'],
    ],
  },
  'controllers-accessories': {
    name: 'Controllers & Accessories',
    description: 'Gamepads, desk mats and the small things that finish a setup.',
    products: [
      ['Wireless Game Controller', 79.0, 25, 'Bluetooth controller compatible with PC, Android and iOS.'],
      ['XL Desk Mat', 35.0, 45, '900 x 400 mm stitched desk mat with a non-slip base.'],
      ['Laptop Stand', 59.0, 30, 'Adjustable aluminium stand that raises the screen to eye level.'],
      ['Monitor Arm', 119.0, 14, 'Gas-spring single monitor arm for screens up to 32 inches.'],
      ['Graphics Tablet', 99.0, 12, 'Pen tablet with 8,192 pressure levels and eight shortcut keys.'],
    ],
  },
};

/**
 * Codes from the previous mixed demo catalogue. Databases seeded before the
 * peripherals catalogue still hold these rows, so the seed deactivates them
 * rather than deleting them: past purchases keep their product references.
 */
const RETIRED = {
  categories: ['electronics', 'clothing', 'home', 'sports', 'books'],
  products: [
    'wireless-headphones', 'smart-watch', 'bluetooth-speaker', 'usb-c-charger',
    'linen-shirt', 'denim-jacket', 'running-shorts', 'wool-beanie',
    'ceramic-mug-set', 'desk-lamp', 'throw-blanket', 'scented-candle',
    'yoga-mat', 'water-bottle', 'resistance-bands', 'surf-wax',
    'gold-coast-walks', 'cooking-for-two', 'learning-javascript', 'reef-field-guide',
  ],
};

/** Soft-delete marker, matching `INACTIVE` in `src/models/crud.model.js`. */
const INACTIVE = { status: 0, statusName: 'INACTIVE' };

/**
 * Turn a display name into a URL-safe code.
 *
 * @param {string} name - Display name.
 * @returns {string} Lowercase, hyphen-separated code.
 */
const toCode = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Upsert rows of a reference table by code.
 *
 * @param {Object} delegate - Prisma delegate.
 * @param {Array<Object>} rows - Rows with a unique `code`.
 * @returns {Promise<Map<string, number>>} Ids by code.
 */
async function upsertByCode(delegate, rows) {
  const ids = new Map();
  for (const row of rows) {
    const saved = await delegate.upsert({ where: { code: row.code }, update: {}, create: { ...row, created } });
    ids.set(row.code, saved.id);
  }
  return ids;
}

/**
 * Seed the database.
 *
 * @returns {Promise<void>}
 * @throws {Error} When the admin credentials are missing.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding.');
  }

  const roles = await upsertByCode(prisma.role, ROLES);
  const genders = await upsertByCode(prisma.gender, GENDERS);
  const documentTypes = await upsertByCode(prisma.document_type, DOCUMENT_TYPES);

  let n = 0;
  for (const [code, { name, description, products }] of Object.entries(CATALOGUE)) {
    const category = await prisma.category.upsert({
      where: { code },
      update: {},
      create: { code, name, img: image(code), description, created },
    });

    for (const [productName, price, stock, productDescription] of products) {
      n += 1;
      const productCode = toCode(productName);
      await prisma.product.upsert({
        where: { code: productCode },
        update: {},
        create: {
          code: productCode,
          name: productName,
          categoryId: category.id,
          price,
          stock,
          img: [image(productCode), image(`${productCode}-2`)],
          description: productDescription,
          created,
        },
      });
    }
  }

  // Products first: a retired category must not keep live products behind it.
  const updated = { user: null, role: 'SYSTEM', server: new Date().toISOString(), source: 'seed' };
  const retiredProducts = await prisma.product.updateMany({
    where: { code: { in: RETIRED.products }, status: { not: 0 } },
    data: { ...INACTIVE, updated },
  });
  await prisma.category.updateMany({
    where: { code: { in: RETIRED.categories }, status: { not: 0 } },
    data: { ...INACTIVE, updated },
  });

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: await bcrypt.hash(password, 12),
      name: 'Store',
      lastName: 'Administrator',
      roleId: roles.get('ADMIN'),
      genderId: genders.get('UNDISCLOSED'),
      documentTypeId: documentTypes.get('PASSPORT'),
      emailVerified: true,
      status: 1,
      statusName: 'ACTIVE',
      created,
    },
  });

  console.log(
    `Seed complete: ${ROLES.length} roles, ${Object.keys(CATALOGUE).length} categories, ${n} products, `
      + `${retiredProducts.count} legacy products retired, admin ${email}.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
