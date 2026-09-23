/**
 * @file Client-side contact form rules.
 *
 * Mirrors the web's lib/contactValidation.js — same limits, same wording — so
 * the user hears about a problem before sending. The API re-validates with
 * the web's own rules and stays the authority: if the two ever drift, the
 * server's messages still reach the right fields.
 */

/** Fields the mobile contact form has. */
export type ContactField = 'name' | 'email' | 'message';

/** What the user typed, per field. */
export type ContactValues = Record<ContactField, string>;

/** At most one message per field. */
export type ContactErrors = Partial<Record<ContactField, string>>;

/** Longest accepted value per field, as in the web rules. */
export const CONTACT_MAX_LENGTH: Record<ContactField, number> = { name: 100, email: 254, message: 2000 };

const REQUIRED: Record<ContactField, string> = {
  name: 'Please enter your name.',
  email: 'Please enter your email.',
  message: 'Please enter a message.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the contact form.
 *
 * Each field stops at its first failure: presence, then length, then format.
 *
 * @param values - What the user typed.
 * @returns One message per failing field; empty when everything passes.
 */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};

  for (const field of Object.keys(REQUIRED) as ContactField[]) {
    const value = values[field].trim();

    if (!value) {
      errors[field] = REQUIRED[field];
    } else if (value.length > CONTACT_MAX_LENGTH[field]) {
      errors[field] = `Please keep this to ${CONTACT_MAX_LENGTH[field]} characters or fewer.`;
    } else if (field === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field] = 'Please enter a valid email address.';
    }
  }

  return errors;
}
