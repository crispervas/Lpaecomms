/**
 * @file State for the sign-in preview.
 *
 * Authentication does not exist yet, so a valid submit checks nothing on a
 * server: the Login tab then opens the Account preview with a sample person.
 * The password is cleared after every valid submit so it is gone when the
 * user signs out and lands back on the form.
 */
import { useState } from 'react';
import { authFields, validateAuth, type AuthErrors, type AuthField, type AuthMode, type AuthValues } from '../lib/authRules';

/** What {@link useAuthForm} returns. */
export interface UseAuthFormResult {
  /** Which form is showing. */
  mode: AuthMode;
  /** What the user typed. */
  values: AuthValues;
  /** Message per failing field. */
  errors: AuthErrors;
  /** Switch between log in and sign up. */
  setMode: (mode: AuthMode) => void;
  /** Change one field; clears its error. */
  setValue: (field: AuthField, value: string) => void;
  /**
   * Validate and show errors.
   *
   * @returns The first invalid field in form order, so the page can move focus
   *   there, or null when the form was valid and the page may sign in.
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

  const setMode = (next: AuthMode) => {
    setModeState(next);
    // The other form has other rules, so its messages would be stale.
    setErrors({});
  };

  const setValue = (field: AuthField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = () => {
    const found = validateAuth(mode, values);
    setErrors(found);
    const firstInvalid = authFields(mode).find((field) => found[field] !== undefined) ?? null;
    if (firstInvalid) return firstInvalid;
    setValues((current) => ({ ...current, password: '' }));
    return null;
  };

  return { mode, values, errors, setMode, setValue, submit };
}
