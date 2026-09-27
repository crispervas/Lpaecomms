/**
 * @file Client-side rules for the admin sign-in form.
 *
 * Mirrors the log-in mode of mobile's lib/authRules.ts and the web's
 * lib/authValidation.js — same limits, same wording, and a password that is
 * never trimmed — so every platform tells a user the same thing about the same
 * input. Kept in .mjs, like describeHealth.mjs, so `node --test` can load it.
 */

/** Longest accepted value per field, as on the web and mobile. */
export const LOGIN_MAX_LENGTH = Object.freeze({ email: 254, password: 128 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_MESSAGE = Object.freeze({
  email: 'Please enter your email.',
  password: 'Please enter your password.',
});

/**
 * Validate the admin sign-in form.
 *
 * Each field stops at its first failure: presence, length, then format.
 *
 * @param {{email: string, password: string}} values - What the user typed.
 * @returns {{email?: string, password?: string}} One message per failing
 *   field; an empty object when every field passes.
 */
export function validateLogin(values) {
  const errors = {};

  for (const field of ['email', 'password']) {
    // A password may legitimately start or end with a space.
    const value = field === 'password' ? values.password : values[field].trim();

    if (!value) {
      errors[field] = REQUIRED_MESSAGE[field];
    } else if (value.length > LOGIN_MAX_LENGTH[field]) {
      errors[field] = `Please keep this to ${LOGIN_MAX_LENGTH[field]} characters or fewer.`;
    } else if (field === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field] = 'Please enter a valid email address.';
    }
  }

  return errors;
}
