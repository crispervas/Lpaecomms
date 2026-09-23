/**
 * @file State for the contact form.
 *
 * Validates on the device first, sends once, and maps the outcome back onto
 * the form: a confirmation that clears it, server messages under their
 * fields, or a form-level error that keeps what the user typed.
 */
import { useRef, useState } from 'react';
import { fieldErrors, sendContact } from '../api/contact';
import { validateContact, type ContactErrors, type ContactField, type ContactValues } from '../lib/contactRules';

/** Where the form is in its send cycle. */
export type ContactStatus = 'idle' | 'sending' | 'sent' | 'failed';

/** What {@link useContactForm} returns. */
export interface UseContactFormResult {
  /** Current field values. */
  values: ContactValues;
  /** Message per failing field. */
  errors: ContactErrors;
  /** Send cycle state. */
  status: ContactStatus;
  /** Form-level error when the send failed for a reason other than a field. */
  formError: string | null;
  /** Change one field; clears that field's error and any previous outcome. */
  setValue: (field: ContactField, value: string) => void;
  /** Validate and send; ignored while a send is in flight. */
  submit: () => void;
}

const EMPTY: ContactValues = { name: '', email: '', message: '' };

/**
 * Manage the contact form.
 *
 * @returns Values, errors, status and the two actions.
 */
export function useContactForm(): UseContactFormResult {
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<ContactStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  // Set synchronously so a second tap before the re-render is still ignored.
  const sending = useRef(false);

  const setValue = (field: ContactField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status === 'sent' || status === 'failed') {
      setStatus('idle');
      setFormError(null);
    }
  };

  const submit = () => {
    if (sending.current) return;

    const clientErrors = validateContact(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    sending.current = true;
    setErrors({});
    setFormError(null);
    setStatus('sending');

    sendContact(values).then((result) => {
      sending.current = false;

      if (result.ok) {
        setValues(EMPTY);
        setStatus('sent');
        return;
      }

      const serverErrors = fieldErrors(result.validation);
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        setStatus('idle');
        return;
      }

      setFormError(result.error);
      setStatus('failed');
    });
  };

  return { values, errors, status, formError, setValue, submit };
}
