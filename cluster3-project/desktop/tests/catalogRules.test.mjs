/**
 * @file Tests for the Catalog's validation and grouping rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  countByCategory,
  slugify,
  validateCategory,
  validateProduct,
} from '../src/renderer/lib/catalogRules.mjs';

const CATEGORIES = [{ id: 'c-01', name: 'Keyboards', slug: 'keyboards' }];
const PRODUCTS = [{ id: 'p-001', categoryId: 'c-01', sku: 'KB-ARIA-87' }];

const product = (overrides = {}) => ({
  name: 'Aria 75',
  sku: 'kb-aria-75',
  categoryId: 'c-01',
  price: '139.50',
  stock: '10',
  status: 'active',
  ...overrides,
});

test('slugifies names, dropping accents and punctuation', () => {
  assert.equal(slugify('  Cámaras & Webcams! '), 'camaras-webcams');
  assert.equal(slugify('***'), '');
});

test('accepts a new category and trims it', () => {
  const result = validateCategory({ name: ' Speakers ', slug: 'speakers', description: '' }, CATEGORIES);
  assert.deepEqual(result, { errors: {}, record: { name: 'Speakers', slug: 'speakers', description: '' } });
});

test('rejects a duplicate category name or slug, ignoring case in the name', () => {
  const { errors, record } = validateCategory({ name: 'KEYBOARDS', slug: 'keyboards', description: '' }, CATEGORIES);
  assert.equal(record, null);
  assert.equal(errors.name, 'A category with this name already exists.');
  assert.equal(errors.slug, 'Another category already uses this slug.');
});

test('requires a name and a well-formed slug', () => {
  const { errors } = validateCategory({ name: '', slug: 'Bad Slug', description: '' }, CATEGORIES);
  assert.equal(errors.name, 'Please enter a category name.');
  assert.equal(errors.slug, 'Use lowercase letters, digits and single hyphens only.');
});

test('accepts a new product and normalises it', () => {
  assert.deepEqual(validateProduct(product(), { categories: CATEGORIES, products: PRODUCTS }), {
    errors: {},
    record: { name: 'Aria 75', sku: 'KB-ARIA-75', categoryId: 'c-01', price: 139.5, stock: 10, status: 'active' },
  });
});

test('rejects a duplicate SKU after uppercasing it', () => {
  const { errors } = validateProduct(product({ sku: 'kb-aria-87' }), { categories: CATEGORIES, products: PRODUCTS });
  assert.equal(errors.sku, 'Another product already uses this SKU.');
});

test('rejects an unknown category, a bad price and fractional stock', () => {
  const { errors, record } = validateProduct(
    product({ categoryId: 'c-99', price: '0', stock: '2.5' }),
    { categories: CATEGORIES, products: PRODUCTS },
  );
  assert.equal(record, null);
  assert.equal(errors.categoryId, 'Please choose a category.');
  assert.equal(errors.price, 'Enter an amount above zero, with up to two decimals.');
  assert.equal(errors.stock, 'Enter a whole number of zero or more.');
});

test('caps the price', () => {
  const { errors } = validateProduct(product({ price: '100000.01' }), { categories: CATEGORIES, products: PRODUCTS });
  assert.equal(errors.price, 'Prices above $100,000 are not accepted.');
});

test('counts products per category', () => {
  const counts = countByCategory([{ categoryId: 'a' }, { categoryId: 'b' }, { categoryId: 'a' }]);
  assert.equal(counts.get('a'), 2);
  assert.equal(counts.get('c') ?? 0, 0);
});
