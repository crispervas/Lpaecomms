/**
 * @file Client-side rules for the admin's user form, for new and edited accounts.
 *
 * Mirrors the API's user schema (web/src/resources/user.resource.js): the same
 * limits and the same password rule, with the same wording for the password,
 * so a form that passes here is not refused for format. The API still
 * enforces every rule — and alone knows whether an email or document is taken.
 */

/** Longest accepted value per field, as in the API. */
const MAX = Object.freeze({
  firstName: 100, lastName: 100, email: 254, password: 72, document: 50, phone: 30, address: 300,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The select fields and what to say when one is left empty. */
const LOOKUPS = Object.freeze({
  roleId: 'Please choose a role.',
  genderId: 'Please choose a gender.',
  documentTypeId: 'Please choose a document type.',
});

/**
 * Message for text over its limit.
 *
 * @param {number} max - The limit.
 * @returns {string} The message.
 */
function tooLong(max) {
  return `Please keep this to ${max} characters or fewer.`;
}

/**
 * Check a password against the API's rule.
 *
 * @param {string} password - Untrimmed: spaces are part of a password.
 * @returns {string|undefined} The message, or undefined when it passes.
 */
function passwordError(password) {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > MAX.password) return tooLong(MAX.password);
  if (!/[A-Za-z]/.test(password)) return 'Include a letter.';
  if (!/\d/.test(password)) return 'Include a digit.';
  return undefined;
}

/**
 * Validate the user form.
 *
 * @param {{firstName: string, lastName: string, email: string, password: string,
 *   roleId: string, genderId: string, documentTypeId: string, document: string,
 *   phone: string, address: string}} values - What the admin typed; ids are
 *   the selects' string values.
 * @param {{creating: boolean}} options - A new account needs a password; an
 *   edited one keeps its own when the field is left blank.
 * @returns {{errors: Record<string, string>, record: object|null}} One message
 *   per failing field, and the normalised record — trimmed text, lowercased
 *   email, numeric ids — when there are none.
 */
export function validateUser(values, { creating }) {
  const errors = {};
  const text = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    document: values.document.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
  };

  if (!text.firstName) errors.firstName = 'Please enter a first name.';
  if (!text.lastName) errors.lastName = 'Please enter a last name.';
  if (!text.email) errors.email = 'Please enter an email.';
  else if (!EMAIL_PATTERN.test(text.email)) errors.email = 'Please enter a valid email address.';

  for (const [field, value] of Object.entries(text)) {
    if (!errors[field] && value.length > MAX[field]) errors[field] = tooLong(MAX[field]);
  }

  if (creating && !values.password) errors.password = 'Please enter a password.';
  else if (values.password) {
    const message = passwordError(values.password);
    if (message) errors.password = message;
  }

  const ids = {};
  for (const [field, message] of Object.entries(LOOKUPS)) {
    ids[field] = Number(values[field]);
    if (!Number.isInteger(ids[field]) || ids[field] <= 0) errors[field] = message;
  }

  const passed = Object.keys(errors).length === 0;
  return { errors, record: passed ? { ...text, password: values.password, ...ids } : null };
}
