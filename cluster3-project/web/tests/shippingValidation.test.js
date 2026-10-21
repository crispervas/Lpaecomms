/**
 * @file Shipping form rules for the checkout.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normaliseShipping, validateShipping } from '../src/lib/shippingValidation.js';

const VALID = {
  fullName: 'Jo Kim', address: '12 Queen St', city: 'Brisbane', state: 'QLD', postcode: '4000', phone: '0412 345 678',
};

test('a complete address has no errors', () => {
  assert.deepEqual(validateShipping(normaliseShipping(VALID)), {});
});

test('the postcode is four digits', () => {
  assert.equal(validateShipping({ ...VALID, postcode: '40000' }).postcode, 'Please enter a 4-digit postcode.');
  assert.equal(validateShipping({ ...VALID, postcode: '40a0' }).postcode, 'Please enter a 4-digit postcode.');
});

test('every field is required', () => {
  const errors = validateShipping(normaliseShipping({}));
  assert.deepEqual(Object.keys(errors).sort(), ['address', 'city', 'fullName', 'phone', 'postcode', 'state']);
});

test('a phone with letters is refused', () => {
  assert.equal(validateShipping({ ...VALID, phone: 'call me' }).phone, 'Please enter a valid phone number.');
});

test('values are trimmed and unknown keys dropped', () => {
  const values = normaliseShipping({ ...VALID, city: '  Brisbane ', admin: 'yes' });
  assert.equal(values.city, 'Brisbane');
  assert.equal('admin' in values, false);
});
