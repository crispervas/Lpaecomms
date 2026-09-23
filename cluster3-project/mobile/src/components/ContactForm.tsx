/**
 * @file Contact form: name, email and message, validated on the device and
 * sent to POST /contact.
 */
import type { FormEvent } from 'react';
import { useContactForm } from '../hooks/useContactForm';
import { CONTACT_MAX_LENGTH, type ContactField } from '../lib/contactRules';
import './ContactForm.css';

const PLACEHOLDER: Record<ContactField, string> = {
  name: 'Your name',
  email: 'Your email',
  message: 'How can we help?',
};

/**
 * Class list for a field wrapper.
 *
 * @param hasError - Whether the field has a message.
 * @returns The class attribute value.
 */
function fieldClass(hasError: boolean): string {
  return hasError ? 'contact-form__field has-error' : 'contact-form__field';
}

/**
 * Render the contact form.
 *
 * @returns The form.
 */
export default function ContactForm() {
  const { values, errors, status, formError, setValue, submit } = useContactForm();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  /** Shared accessibility props for one field. */
  const described = (field: ContactField) => ({
    'aria-label': PLACEHOLDER[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `contact-${field}-error` : undefined,
  });

  const error = (field: ContactField) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} className="contact-form__error">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form className="contact-form" noValidate onSubmit={onSubmit}>
      <div className={fieldClass(Boolean(errors.name))}>
        <input
          className="contact-form__input"
          name="name"
          autoComplete="name"
          placeholder={PLACEHOLDER.name}
          maxLength={CONTACT_MAX_LENGTH.name}
          value={values.name}
          onChange={(event) => setValue('name', event.target.value)}
          {...described('name')}
        />
        {error('name')}
      </div>
      <div className={fieldClass(Boolean(errors.email))}>
        <input
          className="contact-form__input"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={PLACEHOLDER.email}
          maxLength={CONTACT_MAX_LENGTH.email}
          value={values.email}
          onChange={(event) => setValue('email', event.target.value)}
          {...described('email')}
        />
        {error('email')}
      </div>
      <div className={fieldClass(Boolean(errors.message))}>
        <textarea
          className="contact-form__input contact-form__input--area"
          name="message"
          rows={3}
          placeholder={PLACEHOLDER.message}
          maxLength={CONTACT_MAX_LENGTH.message}
          value={values.message}
          onChange={(event) => setValue('message', event.target.value)}
          {...described('message')}
        />
        {error('message')}
      </div>
      {status === 'sent' ? (
        <p className="contact-form__notice" role="status">
          Thanks — we reply within one business day.
        </p>
      ) : null}
      {status === 'failed' && formError ? (
        <p className="contact-form__error" role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className="contact-form__submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
