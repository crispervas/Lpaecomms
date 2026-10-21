/**
 * @file Admin sign-in screen.
 *
 * The first screen of the desktop client, built from the "Admin Login" desktop
 * mockup. A submission that passes the client-side rules is handed to the
 * parent, which signs in through window.api; this screen never performs a
 * request itself. Whatever the parent reports back — wrong password, a
 * non-admin account, an unreachable API — is shown above the submit button.
 */

import { useId, useState } from 'react';

import { validateLogin } from '../lib/loginRules.mjs';

/** Classes shared by both text fields; `has-error` swaps the border colour. */
const FIELD_CLASSES =
  'w-full rounded-[10px] border px-4 py-[13px] text-sm text-lpa-ink placeholder:text-lpa-placeholder ' +
  'focus:outline-none focus:ring-2 focus:ring-lpa-accent/40 focus:border-lpa-accent';

/**
 * Pick the border for a field from its validation state.
 *
 * Written out in full per branch: Tailwind's scanner cannot see a class name
 * assembled from a variable, and it would be stripped from the build.
 *
 * @param {string|undefined} error - The field's message, if it failed.
 * @returns {string} The border colour class.
 */
function borderClass(error) {
  return error ? 'border-lpa-danger' : 'border-lpa-control';
}

/**
 * Render a field's validation message, or nothing while the field is valid.
 *
 * Rendered only on failure so a clean form keeps the mockup's spacing.
 *
 * @param {object} props - Component props.
 * @param {string} props.id - Element id the input's aria-describedby points at.
 * @param {string|undefined} props.message - The field's message, if any.
 * @returns {JSX.Element|null} The message paragraph, or null.
 */
function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-lpa-danger">
      {message}
    </p>
  );
}

/**
 * Render the admin sign-in card.
 *
 * @param {object} props - Component props.
 * @param {(credentials: {email: string, password: string}) => Promise<string|null>} props.onSignIn
 *   Called once the form passes validation; resolves to the message to show,
 *   or null when the sign-in succeeded.
 * @returns {JSX.Element} The centred sign-in card.
 */
export function AdminLogin({ onSignIn }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [pending, setPending] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const id = useId();

  /**
   * Store an edited field and clear its stale message, so an error does not
   * outlive the input it described.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The input's change.
   * @returns {void}
   */
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFailure(null);
  }

  /**
   * Validate on submit and hand a passing form to the parent.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const found = validateLogin(values);
    setErrors(found);
    setFailure(null);

    if (Object.keys(found).length > 0) {
      // Send the user to the first field that needs attention.
      form.elements.namedItem(found.email ? 'email' : 'password').focus();
      return;
    }

    setPending(true);
    const message = await onSignIn({ email: values.email.trim(), password: values.password });
    // On success the parent swaps this screen out, so there is nothing to reset.
    if (message) {
      setPending(false);
      setFailure(message);
      setValues((current) => ({ ...current, password: '' }));
      form.elements.namedItem('password').focus();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-lpa-canvas p-6 font-sans text-lpa-ink antialiased">
      <section
        aria-labelledby={`${id}-title`}
        className="w-[400px] rounded-[20px] border border-lpa-line bg-lpa-surface p-12 shadow-card"
      >
        <header className="mb-8 flex flex-col items-center gap-1.5">
          <div
            aria-hidden="true"
            className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-xl bg-lpa-ink font-display text-[15px] font-bold text-white"
          >
            LPA
          </div>
          <h1 id={`${id}-title`} className="font-display text-xl font-bold">
            Admin Portal
          </h1>
          <p className="text-[13px] text-lpa-subtle">Sign in to manage LPA Ecomms</p>
        </header>

        <form noValidate onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor={`${id}-email`} className="mb-2 block text-[13px] font-semibold">
              Email
            </label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@lpaecomms.com"
              value={values.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
              className={`${FIELD_CLASSES} ${borderClass(errors.email)}`}
            />
            <FieldError id={`${id}-email-error`} message={errors.email} />
          </div>

          <label htmlFor={`${id}-password`} className="mb-2 block text-[13px] font-semibold">
            Password
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${id}-password-error` : undefined}
            className={`${FIELD_CLASSES} ${borderClass(errors.password)}`}
          />
          <FieldError id={`${id}-password-error`} message={errors.password} />

          <div className="mb-6 mt-3.5 flex flex-col items-end">
            <button
              type="button"
              onClick={() => setShowResetHelp((shown) => !shown)}
              aria-expanded={showResetHelp}
              aria-controls={`${id}-reset-help`}
              className="text-[13px] font-semibold text-lpa-accent hover:text-lpa-accent-strong"
            >
              Forgot password?
            </button>
            {/* There is no reset flow for staff accounts yet, so the link
                explains who can help rather than leading nowhere. */}
            <p
              id={`${id}-reset-help`}
              hidden={!showResetHelp}
              className="mt-2 text-right text-xs text-lpa-subtle"
            >
              Ask an LPA Ecomms administrator to reset your password.
            </p>
          </div>

          {/* Always mounted so screen readers announce the message when it appears. */}
          <p role="alert" className="mb-4 text-center text-[13px] text-lpa-danger empty:hidden">
            {failure}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="block w-full rounded-[10px] bg-lpa-ink p-3.5 text-center text-sm font-semibold text-white hover:bg-lpa-ink-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-lpa-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* The mockup's #9A9C9A is 2.8:1 on white and fails WCAG AA for text
            this small, so the footnote uses the subtitle's colour. */}
        <p className="mt-6 text-center text-xs text-lpa-subtle">
          Restricted to authorized LPA Ecomms staff.
        </p>
      </section>
    </main>
  );
}
