/**
 * @file Login and sign-up form rules.
 *
 * The two modes share one page and one POST handler, so the rules are keyed by
 * mode and the controller picks a table rather than branching through a single
 * merged one. Read alongside lib/formRules.js, which applies these, and
 * lib/contactValidation.js, which is built the same way.
 *
 * **None of this authenticates anyone.** There is no user model, no password
 * hashing and no session yet; these rules only decide whether a submission is
 * well formed. The controller says so plainly on every submit.
 */

import {
  attachHtmlPatterns,
  normaliseFields,
  validateFields,
} from './formRules.js';

/** Basic email shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The shortest password worth accepting when one is being chosen. */
const MIN_PASSWORD = 8;

/** The two modes the page renders. Anything else is not a mode. */
export const AUTH_MODES = ['login', 'signup'];

/** Shared between both modes: the same address, checked the same way. */
const emailField = () => ({
  required: true,
  // The maximum length of an email address in RFC 5321.
  maxLength: 254,
  pattern: EMAIL_PATTERN,
  messages: {
    required: 'Please enter your email.',
    invalid: 'Please enter a valid email address.',
    tooLong: 'Please keep this to 254 characters or fewer.',
  },
});

/**
 * What each mode asks for, keyed by the `name` attribute of its control.
 *
 * The password rules deliberately differ. Sign-up enforces a minimum because a
 * password is being *chosen*; log in does not, because an account created
 * before any such rule must still be able to try its existing password. A
 * minimum on the log in form would lock those accounts out of their own
 * failure message.
 *
 * @type {Record<string, Record<string, object>>}
 */
export const AUTH_FIELDS = {
  login: {
    email: emailField(),
    password: {
      required: true,
      maxLength: 128,
      // Never trimmed: a password may legitimately start or end with a space.
      preserveWhitespace: true,
      messages: {
        required: 'Please enter your password.',
        tooLong: 'Please keep this to 128 characters or fewer.',
      },
    },
  },
  signup: {
    name: {
      required: true,
      maxLength: 100,
      messages: {
        required: 'Please enter your name.',
        tooLong: 'Please keep this to 100 characters or fewer.',
      },
    },
    email: emailField(),
    password: {
      required: true,
      minLength: MIN_PASSWORD,
      maxLength: 128,
      preserveWhitespace: true,
      messages: {
        required: 'Please choose a password.',
        tooShort: `Use at least ${MIN_PASSWORD} characters.`,
        tooLong: 'Please keep this to 128 characters or fewer.',
      },
    },
  },
};

for (const fields of Object.values(AUTH_FIELDS)) attachHtmlPatterns(fields);

/**
 * Resolve the `?tab=` query into a mode the template can render.
 *
 * The query string is public and arrives as whatever someone types — or as an
 * array, when a parameter is repeated. Everything unrecognised becomes `login`,
 * so an unknown mode never reaches a template that knows only two.
 *
 * @param {unknown} tab - The raw `tab` query parameter.
 * @returns {'login'|'signup'} A mode that is certainly renderable.
 */
export function resolveMode(tab) {
  return tab === 'signup' ? 'signup' : 'login';
}

/**
 * Reduce a request body to the fields the given mode renders.
 *
 * @param {'login'|'signup'} mode - Which form was submitted.
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {Record<string, string>} One entry per field of that mode.
 */
export function normaliseAuth(mode, body) {
  return normaliseFields(AUTH_FIELDS[mode], body);
}

/**
 * Validate normalised values for the given mode.
 *
 * @param {'login'|'signup'} mode - Which form was submitted.
 * @param {Record<string, string>} values - Normalised input.
 * @returns {Record<string, string>} Field name to error message; empty when valid.
 */
export function validateAuth(mode, values) {
  return validateFields(AUTH_FIELDS[mode], values);
}
