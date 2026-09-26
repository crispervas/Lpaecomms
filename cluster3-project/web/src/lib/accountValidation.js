/**
 * @file Account page rules: which tab to show and what the profile form accepts.
 *
 * Read alongside lib/formRules.js, which applies the field table, and
 * lib/authValidation.js, whose wording and limits these reuse wherever the
 * fields overlap — a person gets the same message about an email here as on
 * the login page. The mobile Account tab (mobile/src/lib/profileRules.ts)
 * mirrors the same limits.
 *
 * **Nothing here saves a profile.** There is no user model yet; these rules
 * only decide whether a submission is well formed.
 */

import {
  attachHtmlPatterns,
  normaliseFields,
  validateFields,
} from './formRules.js';

/** Basic email shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * At least seven digits, optionally led by "+", with the separators people
 * type between them: "+1 (415) 555-0148", "0412 345 678".
 *
 * The digit count lives in the pattern rather than in a separate check so the
 * browser can enforce it from the same `pattern` attribute. Every punctuation
 * mark in the class is escaped because browsers compile `pattern` with the `v`
 * flag, where a bare "(" or "-" inside a class is a syntax error.
 */
const PHONE_PATTERN = /^\+?(?:[\s\(\)\.\-]*\d){7,}[\s\(\)\.\-]*$/;

/** The two tabs the page renders. Anything else is not a tab. */
export const ACCOUNT_TABS = ['profile', 'orders'];

/**
 * Build the message shown when a field runs past its limit.
 *
 * @param {number} maxLength - The field's inclusive maximum.
 * @returns {string} Message naming the limit.
 */
const tooLong = (maxLength) => `Please keep this to ${maxLength} characters or fewer.`;

/**
 * The profile form's fields, keyed by the `name` attribute of each control.
 *
 * The last name is optional because not everybody has one; the phone is
 * optional because the shop never needs to ring anyone.
 *
 * @type {Record<string, object>}
 */
export const PROFILE_FIELDS = attachHtmlPatterns({
  firstName: {
    required: true,
    maxLength: 100,
    messages: {
      required: 'Please enter your first name.',
      tooLong: tooLong(100),
    },
  },
  lastName: {
    required: false,
    maxLength: 100,
    messages: { tooLong: tooLong(100) },
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
  phone: {
    required: false,
    maxLength: 20,
    pattern: PHONE_PATTERN,
    messages: {
      invalid: 'Please enter a valid phone number.',
      tooLong: tooLong(20),
    },
  },
});

/**
 * Resolve the `?tab=` query into a tab the template can render.
 *
 * The query string arrives as whatever someone types — or as an array when a
 * parameter is repeated — so everything unrecognised becomes `profile`.
 *
 * @param {unknown} tab - The raw `tab` query parameter.
 * @returns {'profile'|'orders'} A tab that is certainly renderable.
 */
export function resolveAccountTab(tab) {
  return tab === 'orders' ? 'orders' : 'profile';
}

/**
 * Reduce a request body to the profile form's fields, trimmed.
 *
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {Record<string, string>} One entry per profile field.
 */
export function normaliseProfile(body) {
  return normaliseFields(PROFILE_FIELDS, body);
}

/**
 * Validate normalised profile values.
 *
 * @param {Record<string, string>} values - Normalised input.
 * @returns {Record<string, string>} Field name to error message; empty when valid.
 */
export function validateProfile(values) {
  return validateFields(PROFILE_FIELDS, values);
}

/**
 * Build the avatar initials for a person.
 *
 * @param {string} firstName - Given name.
 * @param {string} lastName - Family name.
 * @returns {string} Up to two upper-case letters, e.g. "JK"; empty when both are blank.
 */
export function initials(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part ?? '').trim().charAt(0))
    .join('')
    .toUpperCase();
}
