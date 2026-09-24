/**
 * @file Client-side sign-in rules.
 *
 * Mirrors the web's lib/authValidation.js — same limits, same wording, and a
 * password that is never trimmed — so both platforms tell a user the same
 * thing about the same input.
 */

/** Which form is showing. */
export type AuthMode = 'login' | 'signup';

/** What the user typed. The name is only used when signing up. */
export interface AuthValues {
  name: string;
  email: string;
  password: string;
}

/** A field of the sign-in form. */
export type AuthField = keyof AuthValues;

/** At most one message per field. */
export type AuthErrors = Partial<Record<AuthField, string>>;

/** Longest accepted value per field, as on the web. */
export const AUTH_MAX_LENGTH: Record<AuthField, number> = { name: 100, email: 254, password: 128 };

/** Shortest password accepted when signing up. */
export const MIN_PASSWORD = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * List the fields a mode shows, in form order.
 *
 * @param mode - Log in or sign up.
 * @returns The field names.
 */
export function authFields(mode: AuthMode): AuthField[] {
  return mode === 'signup' ? ['name', 'email', 'password'] : ['email', 'password'];
}

/** The "required" message per mode and field. */
function requiredMessage(mode: AuthMode, field: AuthField): string {
  if (field === 'name') return 'Please enter your name.';
  if (field === 'email') return 'Please enter your email.';
  return mode === 'signup' ? 'Please choose a password.' : 'Please enter your password.';
}

/**
 * Validate the sign-in form.
 *
 * Each field stops at its first failure: presence, length, then format.
 *
 * @param mode - Log in or sign up.
 * @param values - What the user typed.
 * @returns One message per failing field of that mode; empty when all pass.
 */
export function validateAuth(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};

  for (const field of authFields(mode)) {
    // A password may legitimately start or end with a space.
    const value = field === 'password' ? values.password : values[field].trim();

    if (!value) {
      errors[field] = requiredMessage(mode, field);
    } else if (value.length > AUTH_MAX_LENGTH[field]) {
      errors[field] = `Please keep this to ${AUTH_MAX_LENGTH[field]} characters or fewer.`;
    } else if (field === 'password' && mode === 'signup' && value.length < MIN_PASSWORD) {
      errors[field] = `Use at least ${MIN_PASSWORD} characters.`;
    } else if (field === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field] = 'Please enter a valid email address.';
    }
  }

  return errors;
}
