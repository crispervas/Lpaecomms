/**
 * @file Client-side rules for the Settings → Store info form.
 *
 * The form runs these before handing the details to its `onSave`. When the
 * database arrives, the API must enforce the same limits server-side.
 */

/** Longest accepted value per field. */
export const STORE_MAX_LENGTH = Object.freeze({ name: 80, email: 254, phone: 20 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// An optional leading "+", then digits with the spaces, dots, hyphens and
// brackets people write between them; at least seven digits in all.
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;
const MIN_PHONE_DIGITS = 7;

/**
 * Validate the Store info form.
 *
 * Each field stops at its first failure: presence, length, then format.
 *
 * @param {{name: string, email: string, phone: string}} values - What the
 *   user typed.
 * @returns {{errors: Record<string, string>, record: {name: string,
 *   email: string, phone: string}|null}} One message per failing field, and
 *   the trimmed details when there are none.
 */
export function validateStoreInfo(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();

  if (!name) errors.name = 'Please enter the store name.';
  else if (name.length > STORE_MAX_LENGTH.name) {
    errors.name = `Please keep this to ${STORE_MAX_LENGTH.name} characters or fewer.`;
  }

  if (!email) errors.email = 'Please enter a contact email.';
  else if (email.length > STORE_MAX_LENGTH.email) {
    errors.email = `Please keep this to ${STORE_MAX_LENGTH.email} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!phone) errors.phone = 'Please enter a phone number.';
  else if (phone.length > STORE_MAX_LENGTH.phone) {
    errors.phone = `Please keep this to ${STORE_MAX_LENGTH.phone} characters or fewer.`;
  } else if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) {
    errors.phone = 'Please enter a valid phone number.';
  }

  const passed = Object.keys(errors).length === 0;
  return { errors, record: passed ? { name, email, phone } : null };
}
