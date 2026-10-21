/**
 * @file Checkout helpers: the shipping cookie and the order reference.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHECKOUT_COOKIE, orderReference, readShipping, serialiseShipping } from '../src/lib/checkout.js';

const SHIPPING = {
  fullName: 'Jo Kim', address: '12 Queen St', city: 'Brisbane', state: 'QLD', postcode: '4000', phone: '0412 345 678',
};

test('the order reference carries the date and six base36 characters', () => {
  const reference = orderReference(new Date('2026-10-21T03:00:00Z'), () => Buffer.from([1, 2, 3, 4, 5, 6]));
  assert.match(reference, /^LPA-20261021-[0-9A-Z]{6}$/);
});

test('two references from different random bytes differ', () => {
  const now = new Date('2026-10-21T03:00:00Z');
  assert.notEqual(
    orderReference(now, () => Buffer.from([1, 2, 3, 4, 5, 6])),
    orderReference(now, () => Buffer.from([6, 5, 4, 3, 2, 1])),
  );
});

test('shipping round-trips through the cookie', () => {
  assert.equal(CHECKOUT_COOKIE, 'lpa_checkout');
  assert.deepEqual(readShipping(serialiseShipping(SHIPPING)), SHIPPING);
});

test('an unreadable or invalid cookie reads as no shipping', () => {
  assert.equal(readShipping(undefined), null);
  assert.equal(readShipping('not json'), null);
  assert.equal(readShipping(JSON.stringify({ ...SHIPPING, postcode: 'x' })), null);
  assert.equal(readShipping('[]'), null);
});
