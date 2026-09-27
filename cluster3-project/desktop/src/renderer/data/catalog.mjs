/**
 * @file Sample categories and products shown by the Catalog preview.
 *
 * The database does not exist yet, so the Catalog screen reads these records.
 * Their shapes are the contract the future tables and endpoints should keep —
 * one `categories` table, one `products` table with a `categoryId` foreign key
 * — so integrating the database means replacing these exports with calls
 * through window.api, not reshaping the screen.
 *
 * Product names and prices match the sample orders in ./orders.mjs.
 */

/**
 * @typedef {object} Category
 * @property {string} id - Primary key.
 * @property {string} name - Display name, unique, at most 60 characters.
 * @property {string} slug - URL-safe identifier, unique; the same role as the
 *   API's `categories[].slug` in GET /api/v1/categories.
 * @property {string} description - Optional short text, at most 200 characters.
 */

/**
 * @typedef {object} Product
 * @property {string} id - Primary key.
 * @property {string} categoryId - Foreign key to Category.id.
 * @property {string} name - Display name, at most 100 characters.
 * @property {string} sku - Stock-keeping unit, unique, uppercase.
 * @property {number} price - Dollars with up to two decimals, above zero.
 * @property {number} stock - Units on hand, a whole number of zero or more.
 * @property {'active'|'draft'} status - Whether the storefront lists it.
 */

/** @type {ReadonlyArray<Readonly<Category>>} */
export const SAMPLE_CATALOG_CATEGORIES = Object.freeze(
  [
    { id: 'c-01', name: 'Keyboards', slug: 'keyboards', description: 'Mechanical and low-profile keyboards.' },
    { id: 'c-02', name: 'Mice', slug: 'mice', description: 'Wired and wireless mice.' },
    { id: 'c-03', name: 'Headsets', slug: 'headsets', description: 'Headsets with and without noise cancelling.' },
    { id: 'c-04', name: 'Monitors', slug: 'monitors', description: 'Desktop displays.' },
    { id: 'c-05', name: 'Webcams', slug: 'webcams', description: 'Cameras for calls and streaming.' },
    { id: 'c-06', name: 'Docks', slug: 'docks', description: 'USB-C docks and hubs.' },
  ].map((category) => Object.freeze(category)),
);

/** @type {ReadonlyArray<Readonly<Product>>} */
export const SAMPLE_CATALOG_PRODUCTS = Object.freeze(
  [
    { id: 'p-001', categoryId: 'c-01', name: 'Aria 87 Mechanical', sku: 'KB-ARIA-87', price: 149, stock: 34, status: 'active' },
    { id: 'p-002', categoryId: 'c-01', name: 'Aria 65 Compact', sku: 'KB-ARIA-65', price: 129, stock: 21, status: 'active' },
    { id: 'p-003', categoryId: 'c-01', name: 'Aria 100 Full Size', sku: 'KB-ARIA-100', price: 169, stock: 0, status: 'draft' },
    { id: 'p-004', categoryId: 'c-02', name: 'Glide X Wireless', sku: 'MS-GLIDE-X', price: 79, stock: 58, status: 'active' },
    { id: 'p-005', categoryId: 'c-03', name: 'Cadence Pro ANC', sku: 'HS-CADENCE-PRO', price: 189, stock: 12, status: 'active' },
    { id: 'p-006', categoryId: 'c-04', name: 'Frame 27" QHD', sku: 'MN-FRAME-27Q', price: 329, stock: 9, status: 'active' },
    { id: 'p-007', categoryId: 'c-05', name: 'Lucid 4K Webcam', sku: 'WC-LUCID-4K', price: 119, stock: 27, status: 'active' },
    { id: 'p-008', categoryId: 'c-06', name: 'Nexus 12-in-1 Dock', sku: 'DK-NEXUS-12', price: 99, stock: 40, status: 'active' },
    { id: 'p-009', categoryId: 'c-06', name: 'Nexus Dock', sku: 'DK-NEXUS', price: 99, stock: 16, status: 'active' },
  ].map((product) => Object.freeze(product)),
);
