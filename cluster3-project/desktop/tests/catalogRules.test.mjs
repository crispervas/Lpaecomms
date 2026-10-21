/**
 * @file Tests for the Catalog's validation and grouping rules.
 *
 * The limits are the API's (web/src/resources/{category,product}.resource.js),
 * so a form that passes here is not refused by the server for length or format.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOG_MAX_LENGTH,
  countByCategory,
  toCode,
  validateCategory,
  validateProduct,
} from '../src/renderer/lib/catalogRules.mjs';

const CATEGORIES = [{ id: 1, name: 'Keyboards', code: 'keyboards' }];
const PRODUCTS = [{ id: 10, categoryId: 1, code: 'kb-aria-87' }];

const category = (overrides = {}) => ({ name: 'Speakers', code: 'speakers', description: '', ...overrides });
const product = (overrides = {}) => ({
  name: 'Aria 75',
  code: 'kb-aria-75',
  categoryId: '1',
  price: '139.50',
  stock: '10',
  status: 'active',
  description: '',
  ...overrides,
});

test('the limits follow the API', () => {
  assert.deepEqual(CATALOG_MAX_LENGTH, {
    categoryName: 100, categoryCode: 50, categoryDescription: 2000,
    productName: 150, productCode: 60, productDescription: 5000,
  });
});

test('derives a code from a name, dropping accents and punctuation', () => {
  assert.equal(toCode('  Cámaras & Webcams! '), 'camaras-webcams');
  assert.equal(toCode('***'), '');
});

test('accepts a new category and trims it', () => {
  assert.deepEqual(validateCategory(category({ name: ' Speakers ', description: ' Loud ' }), CATEGORIES), {
    errors: {},
    record: { name: 'Speakers', code: 'speakers', description: 'Loud' },
  });
});

test('rejects a duplicate category name or code, ignoring case in the name', () => {
  const { errors, record } = validateCategory(category({ name: 'KEYBOARDS', code: 'keyboards' }), CATEGORIES);
  assert.equal(record, null);
  assert.equal(errors.name, 'A category with this name already exists.');
  assert.equal(errors.code, 'Another category already uses this code.');
});

test('an edited category may keep its own name and code', () => {
  const result = validateCategory(category({ name: 'Keyboards', code: 'keyboards' }), CATEGORIES, { exceptId: 1 });
  assert.deepEqual(result.errors, {});
});

test('requires a name and a well-formed code', () => {
  const { errors } = validateCategory(category({ name: '', code: 'Bad Code' }), CATEGORIES);
  assert.equal(errors.name, 'Please enter a category name.');
  assert.equal(errors.code, 'Use lowercase letters, digits and single hyphens only.');
});

test('accepts a new product and normalises it', () => {
  assert.deepEqual(validateProduct(product({ code: ' KB-Aria-75 ' }), { categories: CATEGORIES, products: PRODUCTS }), {
    errors: {},
    record: { name: 'Aria 75', code: 'kb-aria-75', categoryId: 1, price: 139.5, stock: 10, status: 'active', description: '' },
  });
});

test('rejects a duplicate product code after lowercasing it', () => {
  const { errors } = validateProduct(product({ code: 'KB-ARIA-87' }), { categories: CATEGORIES, products: PRODUCTS });
  assert.equal(errors.code, 'Another product already uses this code.');
});

test('an edited product may keep its own code', () => {
  const { errors } = validateProduct(product({ code: 'kb-aria-87' }), { categories: CATEGORIES, products: PRODUCTS, exceptId: 10 });
  assert.deepEqual(errors, {});
});

test('rejects an unknown category, a bad price and fractional stock', () => {
  const { errors, record } = validateProduct(
    product({ categoryId: '99', price: '1.234', stock: '2.5' }),
    { categories: CATEGORIES, products: PRODUCTS },
  );
  assert.equal(record, null);
  assert.equal(errors.categoryId, 'Please choose a category.');
  assert.equal(errors.price, 'Enter an amount of zero or more, with up to two decimals.');
  assert.equal(errors.stock, 'Enter a whole number of zero or more.');
});

test('a free product is allowed, as the API allows it', () => {
  assert.deepEqual(validateProduct(product({ price: '0' }), { categories: CATEGORIES, products: PRODUCTS }).errors, {});
});

test('caps the price and the description', () => {
  const { errors } = validateProduct(
    product({ price: '100000.01', description: 'x'.repeat(5001) }),
    { categories: CATEGORIES, products: PRODUCTS },
  );
  assert.equal(errors.price, 'Prices above $100,000 are not accepted.');
  assert.equal(errors.description, 'Please keep this to 5000 characters or fewer.');
});

test('counts products per category', () => {
  const counts = countByCategory([{ categoryId: 1 }, { categoryId: 2 }, { categoryId: 1 }]);
  assert.equal(counts.get(1), 2);
  assert.equal(counts.get(3) ?? 0, 0);
});
