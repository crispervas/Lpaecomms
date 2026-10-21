/**
 * @file Card form rules for the simulated payment: Luhn, expiry, CVC, brand.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cardSummary, luhn, normaliseCard, validateCard } from '../src/lib/cardValidation.js';

const NOW = new Date('2026-10-21T10:00:00Z');
const VALID = { cardholder: 'Jo Kim', cardNumber: '4242424242424242', expiry: '12/30', cvc: '123' };

test('luhn accepts a valid number and rejects a one-digit change', () => {
  assert.equal(luhn('4242424242424242'), true);
  assert.equal(luhn('4242424242424241'), false);
});

test('the card number keeps only its digits', () => {
  assert.equal(normaliseCard({ cardNumber: '4242 4242-4242 4242' }).cardNumber, '4242424242424242');
});

test('only the declared fields survive normalising', () => {
  assert.deepEqual(Object.keys(normaliseCard({ ...VALID, extra: 'x' })).sort(), ['cardNumber', 'cardholder', 'cvc', 'expiry']);
});

test('a valid card has no errors', () => {
  assert.deepEqual(validateCard(VALID, NOW), {});
});

test('the expiry may be this month but not an earlier one', () => {
  assert.equal(validateCard({ ...VALID, expiry: '10/26' }, NOW).expiry, undefined);
  assert.equal(validateCard({ ...VALID, expiry: '09/26' }, NOW).expiry, 'Please enter a future expiry date (MM/YY).');
  assert.equal(validateCard({ ...VALID, expiry: '13/30' }, NOW).expiry, 'Please enter a future expiry date (MM/YY).');
  assert.equal(validateCard({ ...VALID, expiry: '1230' }, NOW).expiry, 'Please enter a future expiry date (MM/YY).');
});

test('number, CVC and cardholder report their own messages', () => {
  const errors = validateCard({ cardholder: '', cardNumber: '4242424242424241', expiry: '12/30', cvc: '12' }, NOW);
  assert.deepEqual(errors, {
    cardholder: 'Please enter the name on the card.',
    cardNumber: 'Please enter a valid card number.',
    cvc: 'Please enter the 3 or 4 digit security code.',
  });
  assert.equal(validateCard({ ...VALID, cardNumber: '42424242' }, NOW).cardNumber, 'Please enter a valid card number.');
});

test('the summary names the brand and keeps only the last four digits', () => {
  assert.deepEqual(cardSummary('4242424242424242'), { brand: 'Visa', last4: '4242' });
  assert.deepEqual(cardSummary('5555555555554444'), { brand: 'Mastercard', last4: '4444' });
  assert.deepEqual(cardSummary('2223003122003222'), { brand: 'Mastercard', last4: '3222' });
  assert.deepEqual(cardSummary('378282246310005'), { brand: 'Amex', last4: '0005' });
  assert.deepEqual(cardSummary('6011111111111117'), { brand: 'Card', last4: '1117' });
});
