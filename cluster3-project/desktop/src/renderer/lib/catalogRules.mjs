/**
 * @file Validation and grouping for the Catalog's categories and products.
 *
 * The forms run these rules before handing a record to their `onSave`. The
 * limits and formats are the API's (web/src/resources/category.resource.js and
 * product.resource.js), so a form that passes here is not refused for length
 * or format; the API still enforces them — client checks are for the user's
 * benefit, never the only guard.
 *
 * Form fields arrive as strings; a passing form returns the record normalised
 * to numbers and trimmed text, ready for lib/apiMapping.mjs.
 */

/** Longest accepted text per field. */
export const CATALOG_MAX_LENGTH = Object.freeze({
  categoryName: 100,
  categoryCode: 50,
  categoryDescription: 2000,
  productName: 150,
  productCode: 60,
  productDescription: 5000,
});

/** Highest accepted price, in dollars; a guard against a mistyped extra digit. */
export const MAX_PRICE = 100_000;

/** Statuses a product can have. */
export const PRODUCT_STATUSES = Object.freeze(['active', 'draft']);

// Stricter than the API's /^[a-z0-9-]+$/ — no leading, trailing or doubled
// hyphens — so every code the form accepts the API accepts too.
const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const STOCK_PATTERN = /^\d+$/;

/**
 * Derive a code from a name: lowercase, accents dropped, words joined by "-".
 *
 * @param {string} name - A display name.
 * @returns {string} The code; empty when the name has no letters or digits.
 */
export function toCode(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Message for text over its limit.
 *
 * @param {number} max - The limit.
 * @returns {string} The message.
 */
function tooLong(max) {
  return `Please keep this to ${max} characters or fewer.`;
}

/**
 * Check a code's presence, length, format and uniqueness.
 *
 * @param {string} code - Trimmed, lowercased code.
 * @param {number} max - Longest accepted code.
 * @param {boolean} taken - Whether another record already uses it.
 * @param {string} taker - "category" or "product", for the message.
 * @returns {string|undefined} The message, or undefined when it passes.
 */
function codeError(code, max, taken, taker) {
  if (!code) return 'Please enter a code.';
  if (code.length > max) return tooLong(max);
  if (!CODE_PATTERN.test(code)) return 'Use lowercase letters, digits and single hyphens only.';
  if (taken) return `Another ${taker} already uses this code.`;
  return undefined;
}

/**
 * Validate the category form, for a new category or an edited one.
 *
 * Each field stops at its first failure: presence, length, format, then
 * uniqueness against the other categories.
 *
 * @param {{name: string, code: string, description: string}} values - What the
 *   user typed.
 * @param {ReadonlyArray<{id: number, name: string, code: string}>} existing -
 *   Categories already in the catalog.
 * @param {{exceptId?: number}} [options] - The category being edited, which
 *   may keep its own name and code.
 * @returns {{errors: Record<string, string>, record: {name: string,
 *   code: string, description: string}|null}} One message per failing field,
 *   and the trimmed record when there are none.
 */
export function validateCategory(values, existing, { exceptId } = {}) {
  const errors = {};
  const others = existing.filter((category) => category.id !== exceptId);
  const name = values.name.trim();
  const code = values.code.trim().toLowerCase();
  const description = values.description.trim();

  if (!name) errors.name = 'Please enter a category name.';
  else if (name.length > CATALOG_MAX_LENGTH.categoryName) errors.name = tooLong(CATALOG_MAX_LENGTH.categoryName);
  else if (others.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    errors.name = 'A category with this name already exists.';
  }

  const codeMessage = codeError(
    code, CATALOG_MAX_LENGTH.categoryCode, others.some((category) => category.code === code), 'category',
  );
  if (codeMessage) errors.code = codeMessage;

  if (description.length > CATALOG_MAX_LENGTH.categoryDescription) {
    errors.description = tooLong(CATALOG_MAX_LENGTH.categoryDescription);
  }

  const passed = Object.keys(errors).length === 0;
  return { errors, record: passed ? { name, code, description } : null };
}

/**
 * Validate the product form, for a new product or an edited one.
 *
 * @param {{name: string, code: string, categoryId: string, price: string,
 *   stock: string, status: string, description: string}} values - What the
 *   user typed; `categoryId` is the select's string value.
 * @param {{categories: ReadonlyArray<{id: number}>,
 *   products: ReadonlyArray<{id: number, code: string}>, exceptId?: number}} catalog -
 *   The current catalog, for the category check and code uniqueness, and the
 *   product being edited.
 * @returns {{errors: Record<string, string>, record: {name: string,
 *   code: string, categoryId: number, price: number, stock: number,
 *   status: string, description: string}|null}} One message per failing
 *   field, and the normalised record when there are none.
 */
export function validateProduct(values, { categories, products, exceptId }) {
  const errors = {};
  const name = values.name.trim();
  // Lowercased before checking, so "KB-Aria" is accepted and stored as "kb-aria".
  const code = values.code.trim().toLowerCase();
  const price = values.price.trim();
  const stock = values.stock.trim();
  const description = values.description.trim();
  const categoryId = Number(values.categoryId);

  if (!name) errors.name = 'Please enter a product name.';
  else if (name.length > CATALOG_MAX_LENGTH.productName) errors.name = tooLong(CATALOG_MAX_LENGTH.productName);

  const codeMessage = codeError(
    code,
    CATALOG_MAX_LENGTH.productCode,
    products.some((product) => product.id !== exceptId && product.code === code),
    'product',
  );
  if (codeMessage) errors.code = codeMessage;

  if (!categories.some((category) => category.id === categoryId)) {
    errors.categoryId = 'Please choose a category.';
  }

  if (!price) errors.price = 'Please enter a price.';
  else if (!PRICE_PATTERN.test(price)) {
    errors.price = 'Enter an amount of zero or more, with up to two decimals.';
  } else if (Number(price) > MAX_PRICE) {
    errors.price = `Prices above $${MAX_PRICE.toLocaleString('en-US')} are not accepted.`;
  }

  if (!stock) errors.stock = 'Please enter the units in stock.';
  else if (!STOCK_PATTERN.test(stock)) errors.stock = 'Enter a whole number of zero or more.';

  if (!PRODUCT_STATUSES.includes(values.status)) errors.status = 'Please choose a status.';

  if (description.length > CATALOG_MAX_LENGTH.productDescription) {
    errors.description = tooLong(CATALOG_MAX_LENGTH.productDescription);
  }

  const passed = Object.keys(errors).length === 0;
  return {
    errors,
    record: passed
      ? { name, code, categoryId, price: Number(price), stock: Number(stock), status: values.status, description }
      : null,
  };
}

/**
 * Count products per category.
 *
 * @param {ReadonlyArray<{categoryId: number}>} products - Every product.
 * @returns {Map<number, number>} Category id to product count; categories with
 *   no products are absent, so read with `?? 0`.
 */
export function countByCategory(products) {
  const counts = new Map();
  for (const product of products) {
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  }
  return counts;
}
