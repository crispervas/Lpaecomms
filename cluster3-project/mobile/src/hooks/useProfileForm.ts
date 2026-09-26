/**
 * @file State for the Account tab's profile form.
 *
 * There is no profile API yet, so a valid save changes nothing on a server:
 * it only says so, the way the Login tab's preview did. The form keeps what
 * the user typed so the preview still feels like editing.
 */
import { useState } from 'react';
import { PROFILE_FIELDS, validateProfile, type ProfileErrors, type ProfileField, type ProfileValues } from '../lib/profileRules';

/** The notice after a valid save. */
export const PROFILE_PREVIEW_NOTICE = 'Profile changes are not saved yet. This is a preview of the account page.';

/** What {@link useProfileForm} returns. */
export interface UseProfileFormResult {
  /** What the form shows. */
  values: ProfileValues;
  /** Message per failing field. */
  errors: ProfileErrors;
  /** The preview notice after a valid save, otherwise null. */
  notice: string | null;
  /** Change one field; clears its error and the notice. */
  setValue: (field: ProfileField, value: string) => void;
  /**
   * Validate; show errors or the preview notice.
   *
   * @returns The first invalid field in form order, so the page can move focus
   *   there, or null when the form was valid.
   */
  submit: () => ProfileField | null;
}

/**
 * Manage the profile form.
 *
 * @param initial - The values the form starts with.
 * @returns State and actions.
 */
export function useProfileForm(initial: ProfileValues): UseProfileFormResult {
  const [values, setValues] = useState<ProfileValues>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const setValue = (field: ProfileField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setNotice(null);
  };

  const submit = () => {
    const found = validateProfile(values);
    setErrors(found);
    const firstInvalid = PROFILE_FIELDS.find((field) => found[field] !== undefined) ?? null;
    setNotice(firstInvalid ? null : PROFILE_PREVIEW_NOTICE);
    return firstInvalid;
  };

  return { values, errors, notice, setValue, submit };
}
