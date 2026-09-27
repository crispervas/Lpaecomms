/**
 * @file Validation and grouping for the Catalog's categories and products.
 *
 * The forms run these rules before handing a record to their `onSave`. When
 * the database arrives, the API must enforce the same limits server-side —
 * client checks are for the user's benefit, never the only guard.
 *
 * Form fields arrive as strings; a passing form returns the record normalised
 * to the shapes documented in data/catalog.mjs.
 */

/** Longest accepted text per field. */
export const CATALOG_MAX_LENGTH = Object.freeze({
  categoryName: 60,
  slug: 60,
  description: 200,
  productName: 100,
  sku: 32,
});

/** Highest accepted price, in dollars; a guard against a mistyped extra digit. */
export const MAX_PRICE = 100_000;

/** Statuses a product can have. */
export const PRODUCT_STATUSES = Object.freeze(['active', 'draft']);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const STOCK_PATTERN = /^\d+$/;

/**
 * Derive a slug from a name: lowercase, accents dropped, words joined by "-".
 *
 * @param {string} name - A display name.
 * @returns {string} The slug; empty when the name has no letters or digits.
 */
export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate the new-category form.
 *
 * Each field stops at its first failure: presence, length, format, then
 * uniqueness against the existing categories.
 *
 * @param {{name: string, slug: string, description: string}} values - What the
 *   user typed.
 * @param {ReadonlyArray<{name: string, slug: string}>} existing - Categories
 *   already in the catalog.
 * @returns {{errors: Record<string, string>, record: {name: string,
 *   slug: string, description: string}|null}} One message per failing field,
 *   and the trimmed record when there are none.
 */
export function validateCategory(values, existing) {
  const errors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const description = values.description.trim();

  if (!name) errors.name = 'Please enter a category name.';
  else if (name.length > CATALOG_MAX_LENGTH.categoryName) {
    errors.name = `Please keep this to ${CATALOG_MAX_LENGTH.categoryName} characters or fewer.`;
  } else if (existing.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    errors.name = 'A category with this name already exists.';
  }

  if (!slug) errors.slug = 'Please enter a slug.';
  else if (slug.length > CATALOG_MAX_LENGTH.slug) {
    errors.slug = `Please keep this to ${CATALOG_MAX_LENGTH.slug} characters or fewer.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'Use lowercase letters, digits and single hyphens only.';
  } else if (existing.some((category) => category.slug === slug)) {
    errors.slug = 'Another category already uses this slug.';
  }

  if (description.length > CATALOG_MAX_LENGTH.description) {
    errors.description = `Please keep this to ${CATALOG_MAX_LENGTH.description} characters or fewer.`;
  }

  const passed = Object.keys(errors).length === 0;
  return { errors, record: passed ? { name, slug, description } : null };
}

/**
 * Validate the new-product form.
 *
 * @param {{name: string, sku: string, categoryId: string, price: string,
 *   stock: string, status: string}} values - What the user typed.
 * @param {{categories: ReadonlyArray<{id: string}>,
 *   products: ReadonlyArray<{sku: string}>}} catalog - The current catalog,
 *   for the category check and SKU uniqueness.
 * @returns {{errors: Record<string, string>, record: {name: string,
 *   sku: string, categoryId: string, price: number, stock: number,
 *   status: string}|null}} One message per failing field, and the normalised
 *   record — SKU uppercased, price and stock as numbers — when there are none.
 */
export function validateProduct(values, { categories, products }) {
  const errors = {};
  const name = values.name.trim();
  // Uppercased before checking, so "kb-aria" is accepted and stored as "KB-ARIA".
  const sku = values.sku.trim().toUpperCase();
  const price = values.price.trim();
  const stock = values.stock.trim();

  if (!name) errors.name = 'Please enter a product name.';
  else if (name.length > CATALOG_MAX_LENGTH.productName) {
    errors.name = `Please keep this to ${CATALOG_MAX_LENGTH.productName} characters or fewer.`;
  }

  if (!sku) errors.sku = 'Please enter a SKU.';
  else if (sku.length > CATALOG_MAX_LENGTH.sku) {
    errors.sku = `Please keep this to ${CATALOG_MAX_LENGTH.sku} characters or fewer.`;
  } else if (!SKU_PATTERN.test(sku)) {
    errors.sku = 'Use letters, digits and single hyphens only.';
  } else if (products.some((product) => product.sku === sku)) {
    errors.sku = 'Another product already uses this SKU.';
  }

  if (!categories.some((category) => category.id === values.categoryId)) {
    errors.categoryId = 'Please choose a category.';
  }

  if (!price) errors.price = 'Please enter a price.';
  else if (!PRICE_PATTERN.test(price) || Number(price) <= 0) {
    errors.price = 'Enter an amount above zero, with up to two decimals.';
  } else if (Number(price) > MAX_PRICE) {
    errors.price = `Prices above $${MAX_PRICE.toLocaleString('en-US')} are not accepted.`;
  }

  if (!stock) errors.stock = 'Please enter the units in stock.';
  else if (!STOCK_PATTERN.test(stock)) errors.stock = 'Enter a whole number of zero or more.';

  if (!PRODUCT_STATUSES.includes(values.status)) errors.status = 'Please choose a status.';

  const passed = Object.keys(errors).length === 0;
  return {
    errors,
    record: passed
      ? { name, sku, categoryId: values.categoryId, price: Number(price), stock: Number(stock), status: values.status }
      : null,
  };
}

/**
 * Count products per category.
 *
 * @param {ReadonlyArray<{categoryId: string}>} products - Every product.
 * @returns {Map<string, number>} Category id to product count; categories with
 *   no products are absent, so read with `?? 0`.
 */
export function countByCategory(products) {
  const counts = new Map();
  for (const product of products) {
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  }
  return counts;
}
