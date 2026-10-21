/**
 * @file Card form rules for the simulated checkout payment.
 *
 * The checkout takes no real payment: these rules decide only whether what was
 * typed looks like a usable card — a number that passes the Luhn check, an
 * expiry that has not passed, a CVC of the right length. Nothing here stores
 * a card; `cardSummary` reduces a number to the brand and last four digits,
 * which is all the order ever records.
 *
 * Read alongside lib/formRules.js, which applies the field table. The checks a
 * table cannot express (Luhn, expiry against today) run after it.
 */

import { attachHtmlPatterns, normaliseFields, validateFields } from './formRules.js';

/** MM/YY with a real month. */
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;

/** Three digits, or four for Amex. */
const CVC_PATTERN = /^\d{3,4}$/;

const NUMBER_MESSAGE = 'Please enter a valid card number.';
const EXPIRY_MESSAGE = 'Please enter a future expiry date (MM/YY).';
const CVC_MESSAGE = 'Please enter the 3 or 4 digit security code.';

/**
 * The payment form's fields, keyed by the `name` attribute of each control.
 *
 * The card number carries no `pattern`: people type it in groups, and an HTML
 * pattern over the raw text would refuse the spaces the server strips anyway.
 *
 * @type {Record<string, object>}
 */
export const CARD_FIELDS = attachHtmlPatterns({
  cardholder: {
    required: true,
    maxLength: 100,
    messages: { required: 'Please enter the name on the card.', tooLong: 'Please keep this to 100 characters or fewer.' },
  },
  cardNumber: {
    required: true,
    // 19 digits plus the separators people type between groups of four.
    maxLength: 23,
    messages: { required: NUMBER_MESSAGE, tooLong: NUMBER_MESSAGE },
  },
  expiry: {
    required: true,
    maxLength: 5,
    pattern: EXPIRY_PATTERN,
    messages: { required: EXPIRY_MESSAGE, tooLong: EXPIRY_MESSAGE, invalid: EXPIRY_MESSAGE },
  },
  cvc: {
    required: true,
    maxLength: 4,
    pattern: CVC_PATTERN,
    messages: { required: CVC_MESSAGE, tooLong: CVC_MESSAGE, invalid: CVC_MESSAGE },
  },
});

/**
 * Check a card number with the Luhn algorithm.
 *
 * @param {string} digits - The number, digits only.
 * @returns {boolean} True when the checksum holds.
 */
export function luhn(digits) {
  let sum = 0;
  // From the right, every second digit is doubled.
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Reduce a request body to the card fields, with the number as digits only.
 *
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {{cardholder: string, cardNumber: string, expiry: string, cvc: string}} Normalised values.
 */
export function normaliseCard(body) {
  const values = normaliseFields(CARD_FIELDS, body);
  values.cardNumber = values.cardNumber.replace(/[\s-]/g, '');
  return values;
}

/**
 * Validate normalised card values.
 *
 * @param {{cardholder: string, cardNumber: string, expiry: string, cvc: string}} values - Normalised input.
 * @param {Date} [now] - Today, injectable so tests do not depend on the clock.
 * @returns {Record<string, string>} Field name to error message; empty when valid.
 */
export function validateCard(values, now = new Date()) {
  const errors = validateFields(CARD_FIELDS, values);

  if (!errors.cardNumber && !(/^\d{13,19}$/.test(values.cardNumber) && luhn(values.cardNumber))) {
    errors.cardNumber = NUMBER_MESSAGE;
  }

  if (!errors.expiry) {
    const [month, year] = values.expiry.split('/').map(Number);
    // A card is valid through the last day of its expiry month, so the month
    // itself still counts.
    const expiry = (2000 + year) * 12 + (month - 1);
    const current = now.getFullYear() * 12 + now.getMonth();
    if (expiry < current) errors.expiry = EXPIRY_MESSAGE;
  }

  return errors;
}

/**
 * Reduce a card number to what an order may record.
 *
 * @param {string} cardNumber - The number, digits only.
 * @returns {{brand: 'Visa'|'Mastercard'|'Amex'|'Card', last4: string}} Brand and last four digits.
 */
export function cardSummary(cardNumber) {
  const prefix2 = Number(cardNumber.slice(0, 2));
  const prefix4 = Number(cardNumber.slice(0, 4));
  let brand = 'Card';
  if (cardNumber.startsWith('4')) brand = 'Visa';
  else if ((prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)) brand = 'Mastercard';
  else if (prefix2 === 34 || prefix2 === 37) brand = 'Amex';
  return { brand, last4: cardNumber.slice(-4) };
}
