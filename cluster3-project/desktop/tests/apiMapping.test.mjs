/**
 * @file Tests for turning API rows into screen shapes and form records into
 * API bodies.
 *
 * Prisma serialises Decimal columns (purchase amounts) as strings, so every
 * money field is checked arriving as text.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fieldErrorsFrom,
  fromCategoryRecord,
  fromProductRecord,
  fromUserRecord,
  isSessionExpired,
  toCategory,
  toDashboard,
  toOrder,
  toProduct,
  toSaveResult,
  toUser,
} from '../src/renderer/lib/apiMapping.mjs';

test('maps a category row and back', () => {
  const row = { id: 3, name: 'Books', code: 'books', description: null, img: null, status: 1 };
  assert.deepEqual(toCategory(row), { id: 3, name: 'Books', code: 'books', description: '' });
  assert.deepEqual(fromCategoryRecord({ name: 'Books', code: 'books', description: '' }), {
    name: 'Books', code: 'books', description: null,
  });
});

test('maps a product, turning published into a status and text money into a number', () => {
  const row = {
    id: 7, categoryId: 3, name: 'Atlas', code: 'atlas', price: '19.90', stock: 4,
    published: false, description: 'Maps', category: { id: 3, name: 'Books', code: 'books' },
  };
  assert.deepEqual(toProduct(row), {
    id: 7, categoryId: 3, name: 'Atlas', code: 'atlas', price: 19.9, stock: 4, status: 'draft', description: 'Maps',
  });
  assert.equal(toProduct({ ...row, published: true }).status, 'active');
});

test('turns a product record into an API body', () => {
  assert.deepEqual(
    fromProductRecord({ name: 'Atlas', code: 'atlas', categoryId: 3, price: 19.9, stock: 4, status: 'draft', description: '' }),
    { name: 'Atlas', code: 'atlas', categoryId: 3, price: 19.9, stock: 4, published: false, description: null },
  );
});

const USER_ROW = {
  id: 5, roleId: 2, genderId: 1, documentTypeId: 1, name: 'Ada', lastName: 'Lovelace', email: 'ada@x.co',
  document: null, phone: '+61 4', address: null, status: 1, createdAt: '2026-09-27T02:30:14.000Z',
  role: { id: 2, name: 'Customer', code: 'CUSTOMER' },
};

test('maps a user row to the Users screen shape', () => {
  assert.deepEqual(toUser(USER_ROW), {
    id: 5, name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.co',
    roleId: 2, role: 'Customer', status: 'active', signedUpOn: '2026-09-27',
    genderId: 1, documentTypeId: 1, document: '', phone: '+61 4', address: '',
  });
  assert.equal(toUser({ ...USER_ROW, role: { code: 'ADMIN' } }).role, 'Admin');
  assert.equal(toUser({ ...USER_ROW, status: 2 }).status, 'blocked');
  assert.equal(toUser({ ...USER_ROW, status: -2 }).status, 'pending');
});

test('a user record becomes an API body; an edit without a password keeps the old one', () => {
  const record = {
    firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.co', password: '',
    roleId: 2, genderId: 1, documentTypeId: 1, document: '', phone: '+61 4', address: '',
  };
  const body = fromUserRecord(record);
  assert.deepEqual(body, {
    name: 'Ada', lastName: 'Lovelace', email: 'ada@x.co',
    roleId: 2, genderId: 1, documentTypeId: 1, document: null, phone: '+61 4', address: null,
  });
  assert.equal('password' in body, false);
  assert.equal(fromUserRecord({ ...record, password: 'Secret123' }).password, 'Secret123');
});

test('maps an order, labelling it by reference or by id', () => {
  const row = {
    id: 12, reference: null, finalAmount: '428.00', paymentStatus: 'SUCCESS', fulfillmentStatus: 'SHIPPED',
    invoice: null, createdAt: '2026-08-04T10:00:00.000Z',
    user: { id: 5, name: 'Ava', lastName: 'Chen', email: 'ava@x.co' },
    // As the API sends it: quantities live in data.lines, not on the line rows.
    products: [{ productId: 3, amount: '400.00', product: { name: 'Frame 27"' } }, { productId: 4, amount: '28.00', product: { name: 'Dock' } }],
    data: { lines: [{ productId: 3, quantity: 2, unitPrice: '200' }, { productId: 4, quantity: 1, unitPrice: '28' }] },
  };
  assert.deepEqual(toOrder(row), {
    id: 12, label: '#12', customer: 'Ava Chen', email: 'ava@x.co', placedOn: '2026-08-04',
    items: ['2 × Frame 27"', 'Dock'], total: 428, status: 'shipped', paymentStatus: 'SUCCESS',
    invoice: '', reference: '',
  });
  assert.equal(toOrder({ ...row, reference: 'LPA-1' }).label, 'LPA-1');
});

test('maps the statistics to the dashboard figures', () => {
  const dashboard = toDashboard({
    users: { total: 12, customers: 10, admins: 2, blocked: 1 },
    orders: { total: 30, byFulfillment: {}, revenue: 4821.5 },
    products: { total: 40, published: 36, drafts: 4 },
    categories: [{ id: 1, name: 'Keyboards', products: 12 }],
  });
  assert.deepEqual(dashboard.kpis.map((kpi) => kpi.label), ['Total users', 'Total orders', 'Products live', 'Revenue']);
  assert.deepEqual(dashboard.kpis.map((kpi) => kpi.value), ['12', '30', '36', '$4,821.50']);
  assert.deepEqual(dashboard.categories, [{ name: 'Keyboards', count: 12 }]);
});

test('collects field errors from a rejected write', () => {
  assert.deepEqual(
    fieldErrorsFrom({ errors: [{ field: 'code', message: 'Code is taken.' }, { message: 'No field.' }] }),
    { code: 'Code is taken.' },
  );
  assert.deepEqual(fieldErrorsFrom({ errors: [] }), {});
});

test('a 401 is an expired session', () => {
  assert.equal(isSessionExpired({ status: 401 }), true);
  assert.equal(isSessionExpired({ status: 403 }), false);
});

test('a successful write saves; a refused one says why, per field where it can', () => {
  assert.equal(toSaveResult({ ok: true, status: 201, errors: [] }), null);
  assert.equal(toSaveResult({ ok: true, status: 200, errors: [] }), null);
  assert.deepEqual(
    toSaveResult({ ok: true, status: 409, error: 'A record with this code already exists.', errors: [{ field: 'code', message: 'code is already in use.' }] }),
    { fieldErrors: { code: 'code is already in use.' }, error: null },
  );
  assert.deepEqual(
    toSaveResult({ ok: true, status: 409, error: "Move or delete this category's products first.", errors: [] }),
    { fieldErrors: {}, error: "Move or delete this category's products first." },
  );
  assert.deepEqual(toSaveResult({ ok: false, status: null, error: 'Cannot reach the API.', errors: [] }), {
    fieldErrors: {}, error: 'Cannot reach the API.',
  });
  assert.deepEqual(
    toSaveResult({ ok: true, status: 400, error: 'Some fields need attention.', errors: [{ field: 'name', message: 'Too long' }] }, { name: 'firstName' }),
    { fieldErrors: { firstName: 'Too long' }, error: null },
  );
});

test('an order without recorded lines still lists its products', () => {
  const order = toOrder({
    id: 1, finalAmount: '5', createdAt: '2026-08-04T00:00:00.000Z', data: null,
    products: [{ productId: 9, product: { name: 'Mug' } }],
  });
  assert.deepEqual(order.items, ['Mug']);
});

test('a field error the form cannot show falls back to the overall message', () => {
  const envelope = {
    ok: true, status: 409, error: 'A record with this value already exists.',
    errors: [{ field: 'value', message: 'value is already in use.' }],
  };
  assert.deepEqual(toSaveResult(envelope, {}, ['name', 'code']), {
    fieldErrors: {}, error: 'A record with this value already exists.',
  });
  assert.deepEqual(
    toSaveResult({ ...envelope, errors: [{ field: 'code', message: 'taken' }, { field: 'img', message: 'bad' }] }, {}, ['name', 'code']),
    { fieldErrors: { code: 'taken' }, error: null },
  );
});
