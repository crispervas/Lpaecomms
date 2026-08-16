/**
 * @file Contact form validation rules.
 *
 * The single source of truth for what the contact form accepts. Three consumers
 * read from here, which is the whole reason it is not inlined in the
 * controller:
 *
 *   1. `contact.controller.js` validates submissions with `validateContact`.
 *   2. `components/shared/formField.ejs` renders each field's limit as native
 *      HTML attributes and each message into a `data-error-*` attribute.
 *   3. `public/js/form-validation.js` reads those attributes back out.
 *
 * The browser therefore never holds a copy of a message, and cannot drift from
 * the server. Rules the browser can enforce natively (required, maximum length,
 * shape) are expressed so they map onto HTML attributes; the script only has to
 * decide which of a field's messages applies.
 *
 * Applying the rules is lib/formRules.js's job, shared with the login form.
 * This file is the table and the wording, nothing else.
 */

import {
  attachHtmlPatterns,
  normaliseFields,
  toHtmlPattern,
  validateFields,
} from './formRules.js';

export { toHtmlPattern };

/** Basic email shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lpaecomms order number: the LPA prefix and a run of digits. Customers copy it
 * out of an email in whatever case they find it, so either case is accepted.
 *
 * Spelled with character classes rather than the `i` flag on purpose. These
 * patterns are handed to HTML `pattern` attributes, and that attribute has no
 * way to express a flag: `/^LPA-\d+$/i` would make the browser reject the
 * `lpa-00248` the server accepts, and the two validators would disagree on the
 * one input most likely to be pasted in lower case.
 */
const ORDER_PATTERN = /^[Ll][Pp][Aa]-\d+$/;

/**
 * Build the message shown when a field runs past its limit.
 *
 * @param {number} maxLength - The field's inclusive maximum.
 * @returns {string} Message naming the limit.
 */
const tooLong = (maxLength) => `Please keep this to ${maxLength} characters or fewer.`;

/**
 * Every field the form submits, keyed by its `name` attribute. `pattern` is
 * checked only once a field has a value, so an optional field with a shape —
 * the order number — stays optional.
 *
 * @type {Record<string, {
 *   required: boolean,
 *   maxLength: number,
 *   pattern?: RegExp,
 *   htmlPattern?: string,
 *   messages: { required?: string, invalid?: string, tooLong: string },
 * }>}
 */
export const CONTACT_FIELDS = attachHtmlPatterns({
  name: {
    required: true,
    maxLength: 100,
    messages: {
      required: 'Please enter your name.',
      tooLong: tooLong(100),
    },
  },
  email: {
    required: true,
    // The maximum length of an email address in RFC 5321.
    maxLength: 254,
    pattern: EMAIL_PATTERN,
    messages: {
      required: 'Please enter your email.',
      invalid: 'Please enter a valid email address.',
      tooLong: tooLong(254),
    },
  },
  orderNumber: {
    required: false,
    maxLength: 20,
    pattern: ORDER_PATTERN,
    messages: {
      invalid: 'Order numbers look like LPA-00248.',
      tooLong: tooLong(20),
    },
  },
  message: {
    required: true,
    maxLength: 2000,
    messages: {
      required: 'Please enter a message.',
      tooLong: tooLong(2000),
    },
  },
});

/**
 * Reduce a request body to the form's own fields, trimmed.
 *
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {{ name: string, email: string, orderNumber: string, message: string }} Trimmed values, missing fields as empty strings.
 */
export function normaliseContact(body) {
  return normaliseFields(CONTACT_FIELDS, body);
}

/**
 * Validate normalised contact values.
 *
 * @param {{ name: string, email: string, orderNumber: string, message: string }} values - Trimmed input, as returned by `normaliseContact`.
 * @returns {Record<string, string>} Field name to error message; empty when everything passes.
 */
export function validateContact(values) {
  return validateFields(CONTACT_FIELDS, values);
}
