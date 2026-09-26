/**
 * @file Client-side rules for the Account tab's profile form.
 *
 * The web has no profile page to mirror yet, so these follow the sign-in
 * rules' wording and limits (authRules) wherever the fields overlap: a user
 * gets the same message about an email here as on the Login tab.
 */

/** What the profile form edits. */
export interface ProfileValues {
  firstName: string;
  email: string;
  phone: string;
}

/** A field of the profile form. */
export type ProfileField = keyof ProfileValues;

/** At most one message per field. */
export type ProfileErrors = Partial<Record<ProfileField, string>>;

/** Fields in form order, so the page can focus the first invalid one. */
export const PROFILE_FIELDS: ProfileField[] = ['firstName', 'email', 'phone'];

/** Longest accepted value per field; name and email match the sign-in form. */
export const PROFILE_MAX_LENGTH: Record<ProfileField, number> = { firstName: 100, email: 254, phone: 20 };

/** Fewest digits a phone number may have: a short local number. */
export const MIN_PHONE_DIGITS = 7;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits plus the separators people type: "+1 (415) 555-0148", "0412 345 678".
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

/**
 * Validate the profile form.
 *
 * The phone is optional; the other fields are required. Each field stops at
 * its first failure: presence, length, then format.
 *
 * @param values - What the user typed.
 * @returns One message per failing field; empty when all pass.
 */
export function validateProfile(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};

  for (const field of PROFILE_FIELDS) {
    const value = values[field].trim();

    if (!value) {
      if (field === 'firstName') errors[field] = 'Please enter your first name.';
      if (field === 'email') errors[field] = 'Please enter your email.';
    } else if (value.length > PROFILE_MAX_LENGTH[field]) {
      errors[field] = `Please keep this to ${PROFILE_MAX_LENGTH[field]} characters or fewer.`;
    } else if (field === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field] = 'Please enter a valid email address.';
    } else if (
      field === 'phone' &&
      (!PHONE_PATTERN.test(value) || value.replace(/\D/g, '').length < MIN_PHONE_DIGITS)
    ) {
      errors[field] = 'Please enter a valid phone number.';
    }
  }

  return errors;
}

/**
 * Build the avatar initials for a person.
 *
 * @param firstName - Given name.
 * @param lastName - Family name.
 * @returns Up to two upper-case letters, e.g. "JK"; empty when both are blank.
 */
export function initials(firstName: string, lastName: string): string {
  return [firstName, lastName]
    .map((part) => part.trim().charAt(0))
    .join('')
    .toUpperCase();
}
