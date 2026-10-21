/**
 * @file Shipping form rules for the checkout.
 *
 * Decides whether a delivery address is complete and well formed. The values
 * travel between checkout steps in a cookie and end up in the order's
 * `data.shipping`, so they are validated on the way in and again when read
 * back. Read alongside lib/formRules.js, which applies the field table.
 */

import { attachHtmlPatterns, normaliseFields, validateFields } from './formRules.js';

/** Australian postcodes are four digits. */
const POSTCODE_PATTERN = /^\d{4}$/;

/**
 * Digits with the separators people type between them, optionally led by "+".
 * Escaped as in lib/accountValidation.js, because browsers compile `pattern`
 * with the `v` flag.
 */
const PHONE_PATTERN = /^\+?(?:[\s\(\)\.\-]*\d){7,}[\s\(\)\.\-]*$/;

/**
 * Build the message shown when a field runs past its limit.
 *
 * @param {number} maxLength - The field's inclusive maximum.
 * @returns {string} Message naming the limit.
 */
const tooLong = (maxLength) => `Please keep this to ${maxLength} characters or fewer.`;

/**
 * The shipping form's fields, keyed by the `name` attribute of each control.
 *
 * @type {Record<string, object>}
 */
export const SHIPPING_FIELDS = attachHtmlPatterns({
  fullName: {
    required: true,
    maxLength: 150,
    messages: { required: 'Please enter the recipient’s name.', tooLong: tooLong(150) },
  },
  address: {
    required: true,
    maxLength: 200,
    messages: { required: 'Please enter the street address.', tooLong: tooLong(200) },
  },
  city: {
    required: true,
    maxLength: 100,
    messages: { required: 'Please enter the city or suburb.', tooLong: tooLong(100) },
  },
  state: {
    required: true,
    maxLength: 50,
    messages: { required: 'Please enter the state.', tooLong: tooLong(50) },
  },
  postcode: {
    required: true,
    maxLength: 4,
    pattern: POSTCODE_PATTERN,
    messages: {
      required: 'Please enter a 4-digit postcode.',
      tooLong: 'Please enter a 4-digit postcode.',
      invalid: 'Please enter a 4-digit postcode.',
    },
  },
  phone: {
    required: true,
    maxLength: 30,
    pattern: PHONE_PATTERN,
    messages: {
      required: 'Please enter a phone number for the courier.',
      tooLong: tooLong(30),
      invalid: 'Please enter a valid phone number.',
    },
  },
});

/**
 * Reduce a request body (or a stored cookie) to the shipping fields.
 *
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {Record<string, string>} One trimmed entry per field.
 */
export function normaliseShipping(body) {
  return normaliseFields(SHIPPING_FIELDS, body);
}

/**
 * Validate normalised shipping values.
 *
 * @param {Record<string, string>} values - Normalised input.
 * @returns {Record<string, string>} Field name to error message; empty when valid.
 */
export function validateShipping(values) {
  return validateFields(SHIPPING_FIELDS, values);
}
