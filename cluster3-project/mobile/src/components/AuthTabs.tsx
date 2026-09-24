/**
 * @file Segmented Log in / Sign up switch at the top of the Login tab.
 */
import type { AuthMode } from '../lib/authRules';
import './AuthTabs.css';

const LABELS: Record<AuthMode, string> = { login: 'Log in', signup: 'Sign up' };

/** Props for {@link AuthTabs}. */
export interface AuthTabsProps {
  /** The form showing. */
  mode: AuthMode;
  /** Called with the chosen form. */
  onChange: (mode: AuthMode) => void;
}

/**
 * Render the switch.
 *
 * @param props - Current mode and change handler.
 * @returns The segmented control.
 */
export default function AuthTabs({ mode, onChange }: AuthTabsProps) {
  return (
    <div className="auth-tabs" role="group" aria-label="Account">
      {(Object.keys(LABELS) as AuthMode[]).map((option) => (
        <button
          key={option}
          type="button"
          className={option === mode ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
          aria-pressed={option === mode}
          onClick={() => onChange(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
