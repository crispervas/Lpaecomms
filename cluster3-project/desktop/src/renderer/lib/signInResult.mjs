/**
 * @file Maps a sign-in result envelope to what the login screen shows.
 *
 * Kept apart from AdminLogin.jsx so `node --test` can load it. The branch that
 * matters is the unreachable one: if a stopped server read as "wrong password",
 * an admin would start doubting a password that is fine.
 */

/** Shown for a 5xx, whose own message is meant for logs rather than people. */
const SERVER_FAULT = 'The API could not sign you in right now. Please try again shortly.';

/** Shown when a failure arrives with no message of its own. */
const GENERIC_FAILURE = 'Sign-in failed. Please try again.';

/**
 * Describe a sign-in envelope.
 *
 * @param {{ok: boolean, status: number|null, data: {user: object}|null, error: string|null}} envelope
 *   Result from `window.api.signIn`.
 * @returns {{admin: {id: number, name: string, email: string, role: string}}|{message: string}}
 *   The signed-in account for the admin frame, or the message to show on the form.
 */
export function describeSignIn(envelope) {
  const user = envelope.data?.user;

  if (envelope.ok && envelope.status === 200 && user) {
    const fullName = [user.name, user.lastName].filter(Boolean).join(' ');
    return {
      // Only ADMIN accounts get this far, so the sidebar can name the role plainly.
      admin: { id: user.id, name: fullName || user.email, email: user.email, role: 'Administrator' },
    };
  }

  if (envelope.ok && envelope.status >= 500) {
    return { message: SERVER_FAULT };
  }

  return { message: envelope.error || GENERIC_FAILURE };
}
