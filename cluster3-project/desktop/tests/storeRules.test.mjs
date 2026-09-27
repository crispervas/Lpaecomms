/**
 * @file Tests for the Store info form's rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateStoreInfo } from '../src/renderer/lib/storeRules.mjs';

const valid = { name: ' LPA Ecomms ', email: 'support@lpaecomms.com', phone: '+1 (415) 555-0148' };

test('accepts the mockup details and trims them', () => {
  assert.deepEqual(validateStoreInfo(valid), {
    errors: {},
    record: { name: 'LPA Ecomms', email: 'support@lpaecomms.com', phone: '+1 (415) 555-0148' },
  });
});

test('requires every field', () => {
  const { errors, record } = validateStoreInfo({ name: '', email: ' ', phone: '' });
  assert.equal(record, null);
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'phone']);
});

test('rejects a malformed email', () => {
  assert.equal(validateStoreInfo({ ...valid, email: 'support@' }).errors.email, 'Please enter a valid email address.');
});

test('rejects letters and too few digits in the phone', () => {
  assert.equal(validateStoreInfo({ ...valid, phone: '555-CALL-LPA' }).errors.phone, 'Please enter a valid phone number.');
  assert.equal(validateStoreInfo({ ...valid, phone: '+1 555' }).errors.phone, 'Please enter a valid phone number.');
});

test('caps the store name', () => {
  assert.equal(
    validateStoreInfo({ ...valid, name: 'x'.repeat(81) }).errors.name,
    'Please keep this to 80 characters or fewer.',
  );
});
