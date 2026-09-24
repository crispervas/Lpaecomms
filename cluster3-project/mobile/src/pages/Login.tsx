/**
 * @file Login tab: a preview of signing in and signing up.
 *
 * Mirrors the web login page — same copy, same rules, and the same notice on
 * a valid submit, because authentication does not exist yet. There is no
 * "Forgot password?" link: without accounts there is nothing to reset.
 */
import type { FormEvent } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import AuthTabs from '../components/AuthTabs';
import { useAuthForm } from '../hooks/useAuthForm';
import { AUTH_MAX_LENGTH, authFields, type AuthField, type AuthMode } from '../lib/authRules';
import './Login.css';

const COPY: Record<AuthMode, { title: string; lead: string; submit: string; prompt: string; switchTo: AuthMode; switchLabel: string }> = {
  login: {
    title: 'Welcome back',
    lead: 'Log in to manage orders and Mashup builds.',
    submit: 'Log in',
    prompt: "Don't have an account?",
    switchTo: 'signup',
    switchLabel: 'Sign up',
  },
  signup: {
    title: 'Create your account',
    lead: 'Join to save builds and track orders.',
    submit: 'Create account',
    prompt: 'Already have an account?',
    switchTo: 'login',
    switchLabel: 'Log in',
  },
};

const FIELD: Record<AuthField, { label: string; type: string; placeholder: string }> = {
  name: { label: 'Full name', type: 'text', placeholder: 'Jordan Kim' },
  email: { label: 'Email', type: 'email', placeholder: 'you@email.com' },
  password: { label: 'Password', type: 'password', placeholder: '••••••••' },
};

/**
 * Autofill hint per field: the OS offers saved credentials for log in and a
 * new strong password for sign up.
 *
 * @param mode - The form showing.
 * @param field - The field.
 * @returns The autocomplete token.
 */
function autocomplete(mode: AuthMode, field: AuthField): string {
  if (field === 'password') return mode === 'signup' ? 'new-password' : 'current-password';
  return field;
}

/**
 * Render the Login tab.
 *
 * @returns The page.
 */
export default function Login() {
  const { mode, values, errors, notice, setMode, setValue, submit } = useAuthForm();
  const copy = COPY[mode];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const firstInvalid = submit();
    // Like the web form: a blocked submit moves focus to the first problem,
    // so a screen reader hears it instead of nothing happening.
    if (firstInvalid) document.getElementById(`auth-${firstInvalid}`)?.focus();
  };

  return (
    <IonPage>
      <IonContent>
        <div className="login">
          <div className="login__brand">
            <span className="login__logo">LPA</span>
            <span className="login__tagline">ECOMMS</span>
          </div>

          <AuthTabs mode={mode} onChange={setMode} />

          <h1 className="login__title">{copy.title}</h1>
          <p className="login__lead">{copy.lead}</p>

          <p className="login__notice" role="status">
            {notice}
          </p>

          <form className="login__form" noValidate onSubmit={onSubmit}>
            {authFields(mode).map((field) => {
              const id = `auth-${field}`;
              const error = errors[field];
              return (
                <div key={field} className={error ? 'login__field has-error' : 'login__field'}>
                  <label className="login__label" htmlFor={id}>
                    {FIELD[field].label}
                  </label>
                  <input
                    id={id}
                    className="login__input"
                    name={field}
                    type={FIELD[field].type}
                    autoComplete={autocomplete(mode, field)}
                    placeholder={FIELD[field].placeholder}
                    maxLength={AUTH_MAX_LENGTH[field]}
                    value={values[field]}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => setValue(field, event.target.value)}
                  />
                  {error ? (
                    <p id={`${id}-error`} className="login__error">
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <button type="submit" className="login__submit">
              {copy.submit}
            </button>
          </form>

          <p className="login__switch">
            {copy.prompt}{' '}
            <button type="button" className="login__switch-link" onClick={() => setMode(copy.switchTo)}>
              {copy.switchLabel}
            </button>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
