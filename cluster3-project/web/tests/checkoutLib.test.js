/**
 * @file Checkout helpers: the checkout cookie and the order reference.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECKOUT_COOKIE,
  newCheckoutToken,
  orderReference,
  readCheckout,
  serialiseCheckout,
} from '../src/lib/checkout.js';

const SHIPPING = {
  fullName: 'Jo Kim', address: '12 Queen St', city: 'Brisbane', state: 'QLD', postcode: '4000', phone: '0412 345 678',
};
const TOKEN = 'a'.repeat(32);

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

test('a checkout token is 32 hex characters and new each time', () => {
  assert.match(newCheckoutToken(), /^[0-9a-f]{32}$/);
  assert.notEqual(newCheckoutToken(), newCheckoutToken());
});

test('the checkout round-trips through the cookie for its own customer', () => {
  assert.equal(CHECKOUT_COOKIE, 'lpa_checkout');
  const raw = serialiseCheckout({ customerId: 7, token: TOKEN, shipping: SHIPPING });
  assert.deepEqual(readCheckout(raw, 7), { token: TOKEN, shipping: SHIPPING });
});

test('another customer’s checkout reads as none', () => {
  const raw = serialiseCheckout({ customerId: 7, token: TOKEN, shipping: SHIPPING });
  assert.equal(readCheckout(raw, 8), null);
});

test('an unreadable or invalid cookie reads as none', () => {
  assert.equal(readCheckout(undefined, 7), null);
  assert.equal(readCheckout('not json', 7), null);
  assert.equal(readCheckout('[]', 7), null);
  assert.equal(readCheckout(serialiseCheckout({ customerId: 7, token: TOKEN, shipping: { ...SHIPPING, postcode: 'x' } }), 7), null);
  assert.equal(readCheckout(serialiseCheckout({ customerId: 7, token: 'short', shipping: SHIPPING }), 7), null);
});
