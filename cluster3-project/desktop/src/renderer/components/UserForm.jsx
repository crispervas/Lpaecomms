/**
 * @file The admin's form for a new or an edited user account.
 *
 * No mockup draws it; it follows the Catalog forms, whose frame and buttons it
 * reuses. It validates with lib/userRules.mjs and hands the record to
 * `onSave`, which answers with what the API refused — a taken email, say —
 * shown under the matching field.
 */

import { useId, useState } from 'react';

import { validateUser } from '../lib/userRules.mjs';
import { FormActions, FormPanel } from './CatalogForms.jsx';
import { CONTROL, Field, borderClass } from './formParts.jsx';

/**
 * Render the user form.
 *
 * @param {object} props - Component props.
 * @param {object|null} [props.initial] - The user being edited (lib/apiMapping.mjs
 *   toUser shape); omitted for a new account.
 * @param {{roles: Array<{id: number, name: string}>, genders: Array<{id: number, name: string}>,
 *   documentTypes: Array<{id: number, name: string}>}} props.lookups - Options for the selects.
 * @param {(record: object) => Promise<{fieldErrors: Record<string, string>, error: string|null}|null>}
 *   props.onSave - Stores the validated account; resolves to null once stored.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The form panel.
 */
export function UserForm({ initial = null, lookups, onSave, onCancel }) {
  const id = useId();
  const creating = initial === null;
  // Selects hold their value as text; the rules turn ids back into numbers.
  const [values, setValues] = useState({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    password: '',
    roleId: String(initial?.roleId ?? ''),
    genderId: String(initial?.genderId ?? ''),
    documentTypeId: String(initial?.documentTypeId ?? ''),
    document: initial?.document ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  /**
   * Store an edited field and clear its stale messages.
   *
   * @param {string} field - The field edited.
   * @param {string} value - Its new value.
   * @returns {void}
   */
  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFailure(null);
  }

  /**
   * Validate, then save; show what the API refused.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const { errors: found, record } = validateUser(values, { creating });
    setErrors(found);
    if (!record) return;

    setBusy(true);
    const result = await onSave(record);
    // On success the screen closes this form, so there is nothing to reset.
    if (result) {
      setBusy(false);
      setErrors(result.fieldErrors);
      setFailure(result.error);
    }
  }

  /**
   * Render a text input bound to a field.
   *
   * @param {string} field - The field name.
   * @param {object} [extra] - Extra input attributes.
   * @returns {(describedBy: string|undefined) => JSX.Element} Field renderer.
   */
  const textInput = (field, extra = {}) => (describedBy) => (
    <input
      id={`${id}-${field}`}
      value={values[field]}
      onChange={(event) => update(field, event.target.value)}
      aria-invalid={Boolean(errors[field])}
      aria-describedby={describedBy}
      className={`${CONTROL} ${borderClass(errors[field])}`}
      {...extra}
    />
  );

  /**
   * Render a select bound to a lookup field.
   *
   * @param {string} field - The field name.
   * @param {Array<{id: number, name: string}>} options - Its choices.
   * @returns {(describedBy: string|undefined) => JSX.Element} Field renderer.
   */
  const lookupSelect = (field, options) => (describedBy) => (
    <select
      id={`${id}-${field}`}
      value={values[field]}
      onChange={(event) => update(field, event.target.value)}
      aria-invalid={Boolean(errors[field])}
      aria-describedby={describedBy}
      className={`${CONTROL} ${borderClass(errors[field])}`}
    >
      <option value="">Choose…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );

  return (
    <FormPanel title={creating ? 'New user' : `Edit ${initial.name}`} onSubmit={handleSubmit}>
      <Field id={`${id}-firstName`} label="First name" error={errors.firstName}>
        {textInput('firstName', { autoComplete: 'off' })}
      </Field>
      <Field id={`${id}-lastName`} label="Last name" error={errors.lastName}>
        {textInput('lastName', { autoComplete: 'off' })}
      </Field>
      <Field id={`${id}-email`} label="Email" error={errors.email}>
        {textInput('email', { type: 'email', autoComplete: 'off' })}
      </Field>
      <Field
        id={`${id}-password`}
        label="Password"
        hint={creating ? 'At least 8 characters, with a letter and a digit.' : 'Leave blank to keep the current password.'}
        error={errors.password}
      >
        {textInput('password', { type: 'password', autoComplete: 'new-password' })}
      </Field>
      <Field id={`${id}-roleId`} label="Role" error={errors.roleId}>
        {lookupSelect('roleId', lookups.roles)}
      </Field>
      <Field id={`${id}-genderId`} label="Gender" error={errors.genderId}>
        {lookupSelect('genderId', lookups.genders)}
      </Field>
      <Field id={`${id}-documentTypeId`} label="Document type" error={errors.documentTypeId}>
        {lookupSelect('documentTypeId', lookups.documentTypes)}
      </Field>
      <Field id={`${id}-document`} label="Document number" hint="Optional." error={errors.document}>
        {textInput('document')}
      </Field>
      <Field id={`${id}-phone`} label="Phone" hint="Optional." error={errors.phone}>
        {textInput('phone', { type: 'tel' })}
      </Field>
      <Field id={`${id}-address`} label="Address" hint="Optional." error={errors.address}>
        {textInput('address')}
      </Field>
      <FormActions submitLabel={creating ? 'Create user' : 'Save changes'} busy={busy} error={failure} onCancel={onCancel} />
    </FormPanel>
  );
}
