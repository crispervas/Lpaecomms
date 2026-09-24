/**
 * @file State for the sign-in preview.
 *
 * Authentication does not exist yet, so a valid submit only says so — the
 * same notice the web shows. The password is cleared after every valid
 * submit so it never lingers on screen.
 */
import { useState } from 'react';
import { authFields, validateAuth, type AuthErrors, type AuthField, type AuthMode, type AuthValues } from '../lib/authRules';

/** The web's notice for a valid sign-in or sign-up. */
export const AUTH_PREVIEW_NOTICE =
  'Authentication is not available yet. This is a preview of the sign-in experience.';

/** What {@link useAuthForm} returns. */
export interface UseAuthFormResult {
  /** Which form is showing. */
  mode: AuthMode;
  /** What the user typed. */
  values: AuthValues;
  /** Message per failing field. */
  errors: AuthErrors;
  /** The preview notice after a valid submit, otherwise null. */
  notice: string | null;
  /** Switch between log in and sign up. */
  setMode: (mode: AuthMode) => void;
  /** Change one field; clears its error and the notice. */
  setValue: (field: AuthField, value: string) => void;
  /**
   * Validate; show errors or the preview notice.
   *
   * @returns The first invalid field in form order, so the page can move focus
   *   there, or null when the form was valid.
   */
  submit: () => AuthField | null;
}

const EMPTY: AuthValues = { name: '', email: '', password: '' };

/**
 * Manage the sign-in form.
 *
 * @param initialMode - The form to start on; log in by default.
 * @returns State and actions.
 */
export function useAuthForm(initialMode: AuthMode = 'login'): UseAuthFormResult {
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [values, setValues] = useState<AuthValues>(EMPTY);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const setMode = (next: AuthMode) => {
    setModeState(next);
    // The other form has other rules, so its messages would be stale.
    setErrors({});
    setNotice(null);
  };

  const setValue = (field: AuthField, value: string) => {
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
    const found = validateAuth(mode, values);
    setErrors(found);
    const firstInvalid = authFields(mode).find((field) => found[field] !== undefined) ?? null;
    if (firstInvalid) {
      setNotice(null);
      return firstInvalid;
    }
    setValues((current) => ({ ...current, password: '' }));
    setNotice(AUTH_PREVIEW_NOTICE);
    return null;
  };

  return { mode, values, errors, notice, setMode, setValue, submit };
}
