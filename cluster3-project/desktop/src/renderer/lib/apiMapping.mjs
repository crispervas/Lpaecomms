/**
 * @file Translation between the REST API's rows and the admin screens' shapes.
 *
 * The screens were built on sample data with their own vocabulary — a product
 * `status` of active/draft, a user `role` of Admin/Customer, an order `status`
 * in lowercase — and this module is the one place that vocabulary meets the
 * API's. Kept in .mjs so `node --test` can load it.
 *
 * Prisma serialises Decimal columns (purchase amounts) as strings, so every
 * money field passes through Number() here and nowhere else.
 */

import { formatMoney } from './format.mjs';

/** API user status codes to the screen's words. */
const USER_STATUS = Object.freeze({ 1: 'active', 2: 'blocked', '-2': 'pending' });

/**
 * Empty text for null, so form inputs always receive a string.
 *
 * @param {string|null|undefined} value - A nullable column.
 * @returns {string} The value, or ''.
 */
function text(value) {
  return value ?? '';
}

/**
 * Null for blank text, which the API stores as "no value".
 *
 * @param {string} value - Trimmed form text.
 * @returns {string|null} The text, or null when blank.
 */
function nullable(value) {
  return value ? value : null;
}

/**
 * The calendar date of an ISO timestamp.
 *
 * @param {string} iso - e.g. "2026-09-27T02:30:14.000Z".
 * @returns {string} "YYYY-MM-DD" (UTC).
 */
function dateOf(iso) {
  return String(iso).slice(0, 10);
}

/**
 * Map a category row.
 *
 * @param {object} row - From GET /categories.
 * @returns {{id: number, name: string, code: string, description: string}} The category.
 */
export function toCategory(row) {
  return { id: row.id, name: row.name, code: row.code, description: text(row.description) };
}

/**
 * Turn a validated category record into an API body.
 *
 * @param {{name: string, code: string, description: string}} record - From lib/catalogRules.mjs.
 * @returns {{name: string, code: string, description: string|null}} The body.
 */
export function fromCategoryRecord({ name, code, description }) {
  return { name, code, description: nullable(description) };
}

/**
 * Map a product row.
 *
 * @param {object} row - From GET /products (with an admin token, so drafts included).
 * @returns {{id: number, categoryId: number, name: string, code: string,
 *   price: number, stock: number, status: 'active'|'draft', description: string}} The product.
 */
export function toProduct(row) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    code: row.code,
    price: Number(row.price),
    stock: row.stock,
    status: row.published === false ? 'draft' : 'active',
    description: text(row.description),
  };
}

/**
 * Turn a validated product record into an API body.
 *
 * @param {{name: string, code: string, categoryId: number, price: number,
 *   stock: number, status: string, description: string}} record - From lib/catalogRules.mjs.
 * @returns {object} The body, with `published` in place of `status`.
 */
export function fromProductRecord({ status, description, ...rest }) {
  return { ...rest, published: status !== 'draft', description: nullable(description) };
}

/**
 * Map a user row.
 *
 * @param {object} row - From GET /users; `role` is included, the password never is.
 * @returns {object} The user, with `name` as the full name for the table and
 *   `firstName`/`lastName` for the form.
 */
export function toUser(row) {
  return {
    id: row.id,
    name: [row.name, row.lastName].filter(Boolean).join(' '),
    firstName: row.name,
    lastName: row.lastName,
    email: row.email,
    roleId: row.roleId,
    role: row.role?.code === 'ADMIN' ? 'Admin' : 'Customer',
    status: USER_STATUS[row.status] ?? 'active',
    signedUpOn: dateOf(row.createdAt),
    genderId: row.genderId,
    documentTypeId: row.documentTypeId,
    document: text(row.document),
    phone: text(row.phone),
    address: text(row.address),
  };
}

/**
 * Turn a validated user record into an API body.
 *
 * A blank password is left out, so editing an account without typing one keeps
 * the current password.
 *
 * @param {object} record - From lib/userRules.mjs.
 * @returns {object} The body.
 */
export function fromUserRecord(record) {
  const body = {
    name: record.firstName,
    lastName: record.lastName,
    email: record.email,
    roleId: record.roleId,
    genderId: record.genderId,
    documentTypeId: record.documentTypeId,
    document: nullable(record.document),
    phone: nullable(record.phone),
    address: nullable(record.address),
  };
  if (record.password) body.password = record.password;
  return body;
}

/**
 * Map a purchase row.
 *
 * @param {object} row - From GET /purchases, with `user` and `products` included.
 * @returns {object} The order: `label` is what the table shows as its number.
 */
export function toOrder(row) {
  // Line rows carry no quantity; the purchase records it in data.lines.
  const quantityOf = new Map((row.data?.lines ?? []).map((line) => [line.productId, line.quantity]));
  return {
    id: row.id,
    label: row.reference || `#${row.id}`,
    customer: [row.user?.name, row.user?.lastName].filter(Boolean).join(' ') || text(row.user?.email),
    email: text(row.user?.email),
    placedOn: dateOf(row.createdAt),
    items: (row.products ?? []).map(({ productId, product }) => {
      const quantity = quantityOf.get(productId) ?? 1;
      const name = product?.name ?? 'Product';
      return quantity > 1 ? `${quantity} × ${name}` : name;
    }),
    total: Number(row.finalAmount),
    status: String(row.fulfillmentStatus ?? 'PENDING').toLowerCase(),
    paymentStatus: row.paymentStatus,
    invoice: text(row.invoice),
    reference: text(row.reference),
  };
}

/**
 * Map GET /stats to the dashboard's figures.
 *
 * @param {object} stats - The statistics payload.
 * @returns {{kpis: Array<{label: string, value: string}>,
 *   categories: Array<{name: string, count: number}>}} Ready-formatted figures.
 */
export function toDashboard(stats) {
  const count = (value) => value.toLocaleString('en-US');
  return {
    kpis: [
      { label: 'Total users', value: count(stats.users.total) },
      { label: 'Total orders', value: count(stats.orders.total) },
      { label: 'Products live', value: count(stats.products.published) },
      { label: 'Revenue', value: formatMoney(stats.orders.revenue, { alwaysCents: true }) },
    ],
    categories: stats.categories.map(({ name, products }) => ({ name, count: products })),
  };
}

/**
 * Per-field messages from a rejected write, keyed by form field.
 *
 * @param {{errors?: Array<{field?: string, message: string}>}} envelope - The write's result.
 * @param {Record<string, string>} [rename] - API field name to form field name,
 *   where they differ (the API's user `name` is the form's `firstName`).
 * @returns {Record<string, string>} Messages; entries without a field are left
 *   to the caller, which shows `envelope.error`.
 */
export function fieldErrorsFrom(envelope, rename = {}) {
  const found = {};
  for (const { field, message } of envelope.errors ?? []) {
    if (field) found[rename[field] ?? field] = message;
  }
  return found;
}

/**
 * Whether a result means the session is over and the admin must sign in again.
 *
 * @param {{status: number|null}} envelope - Any admin call's result.
 * @returns {boolean} True for a 401.
 */
export function isSessionExpired(envelope) {
  return envelope.status === 401;
}

/**
 * Turn a write's result into what a form shows.
 *
 * @param {{ok: boolean, status: number|null, error: string|null,
 *   errors?: Array<{field?: string, message: string}>}} envelope - The write's result.
 * @param {Record<string, string>} [rename] - As in fieldErrorsFrom.
 * @param {ReadonlyArray<string>|null} [fields] - The fields the form shows. A
 *   message for any other field would be invisible, so it is dropped and the
 *   overall message shown instead; null keeps every field message.
 * @returns {{fieldErrors: Record<string, string>, error: string|null}|null}
 *   Null when the write succeeded; otherwise per-field messages, and the
 *   overall message only when no shown field explains the failure.
 */
export function toSaveResult(envelope, rename = {}, fields = null) {
  if (envelope.ok && envelope.status >= 200 && envelope.status < 300) return null;
  const all = fieldErrorsFrom(envelope, rename);
  const fieldErrors = fields ? Object.fromEntries(Object.entries(all).filter(([field]) => fields.includes(field))) : all;
  const explained = Object.keys(fieldErrors).length > 0;
  return { fieldErrors, error: explained ? null : envelope.error ?? 'The change could not be saved.' };
}
