/**
 * @file The Account tab's Profile view: first name, email and phone, with a
 * save that only previews until a profile API exists.
 */
import type { FormEvent } from 'react';
import { useProfileForm } from '../hooks/useProfileForm';
import { PROFILE_MAX_LENGTH, type ProfileField, type ProfileValues } from '../lib/profileRules';
import './ProfileForm.css';

const FIELD: Record<ProfileField, { label: string; type: string; autoComplete: string }> = {
  firstName: { label: 'First name', type: 'text', autoComplete: 'given-name' },
  email: { label: 'Email', type: 'email', autoComplete: 'email' },
  phone: { label: 'Phone', type: 'tel', autoComplete: 'tel' },
};

/** Props for {@link ProfileForm}. */
export interface ProfileFormProps {
  /** The values the form starts with. */
  initial: ProfileValues;
}

/**
 * Render the profile form.
 *
 * @param props - Starting values.
 * @returns The form.
 */
export default function ProfileForm({ initial }: ProfileFormProps) {
  const { values, errors, notice, setValue, submit } = useProfileForm(initial);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const firstInvalid = submit();
    // As on the Login tab: a blocked save moves focus to the first problem.
    if (firstInvalid) document.getElementById(`profile-${firstInvalid}`)?.focus();
  };

  return (
    <form className="profile-form" noValidate onSubmit={onSubmit}>
      {(Object.keys(FIELD) as ProfileField[]).map((field) => {
        const id = `profile-${field}`;
        const error = errors[field];
        return (
          <div key={field} className={error ? 'profile-form__field has-error' : 'profile-form__field'}>
            <label className="profile-form__label" htmlFor={id}>
              {FIELD[field].label}
            </label>
            <input
              id={id}
              className="profile-form__input"
              name={field}
              type={FIELD[field].type}
              autoComplete={FIELD[field].autoComplete}
              maxLength={PROFILE_MAX_LENGTH[field]}
              value={values[field]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => setValue(field, event.target.value)}
            />
            {error ? (
              <p id={`${id}-error`} className="profile-form__error">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
      {/* Always rendered: a live region that appears with its message is
          skipped by some screen readers. */}
      <p className="profile-form__notice" role="status">
        {notice}
      </p>
      <button type="submit" className="profile-form__submit">
        Save changes
      </button>
    </form>
  );
}
