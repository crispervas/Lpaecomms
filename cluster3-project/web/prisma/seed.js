/**
 * @file Database seed.
 *
 * Fills a fresh development/staging database with the reference data the app
 * cannot run without (roles, genders, document types), a small catalogue so
 * the storefront and the mobile app have something to show, and one
 * administrator. Idempotent: every write is an upsert on a unique code/email,
 * so running it twice changes nothing. Credentials come from the environment.
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

const CATALOGUE = {
  electronics: { name: 'Electronics', products: ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', 'USB-C Charger'] },
  clothing: { name: 'Clothing', products: ['Linen Shirt', 'Denim Jacket', 'Running Shorts', 'Wool Beanie'] },
  home: { name: 'Home', products: ['Ceramic Mug Set', 'Desk Lamp', 'Throw Blanket', 'Scented Candle'] },
  sports: { name: 'Sports', products: ['Yoga Mat', 'Water Bottle', 'Resistance Bands', 'Surf Wax'] },
  books: { name: 'Books', products: ['Gold Coast Walks', 'Cooking for Two', 'Learning JavaScript', 'Reef Field Guide'] },
};

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
  for (const [code, { name, products }] of Object.entries(CATALOGUE)) {
    const category = await prisma.category.upsert({
      where: { code },
      update: {},
      create: { code, name, img: image(code), description: `${name} from Lpaecomms.`, created },
    });

    for (const productName of products) {
      n += 1;
      const productCode = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await prisma.product.upsert({
        where: { code: productCode },
        update: {},
        create: {
          code: productCode,
          name: productName,
          categoryId: category.id,
          price: 9.95 + n * 5,
          stock: 10 + n,
          img: [image(productCode), image(`${productCode}-2`)],
          description: `${productName}, picked for the Lpaecomms ${name.toLowerCase()} range.`,
          created,
        },
      });
    }
  }

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

  console.log(`Seed complete: ${ROLES.length} roles, ${n} products, admin ${email}.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
